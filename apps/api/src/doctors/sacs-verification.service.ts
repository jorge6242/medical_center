import * as https from 'node:https';
import * as zlib from 'node:zlib';

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

export interface SacsQueryResult {
  found: boolean;
  doctorName?: string;
  specialty?: string;
  licenseNumber?: string;
  rawHtml?: string;
}

const SACS_ENDPOINT = 'https://sistemas.sacs.gob.ve/consultas/prfsnal_salud';

@Injectable()
export class SacsVerificationService {
  private readonly logger = new Logger(SacsVerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyByDocument(documentType: string, documentId: string): Promise<SacsQueryResult> {
    this.logger.log(`Verifying doctor by document: ${documentType}-${documentId}`);
    const body = this.buildXajaxBody(documentType, documentId);
    return this.querySacs(body);
  }

  async verifyByLicense(_licenseNumber: string): Promise<SacsQueryResult> {
    // SACS endpoint queries by cedula (document ID), not by license number.
    // License number is stored for audit purposes but verification uses documentId.
    this.logger.warn(
      'verifyByLicense not supported by SACS — use verifyByDocument instead',
    );
    return Promise.resolve({ found: false });
  }

  async verifyDoctor(doctorId: string): Promise<void> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      this.logger.error(`Doctor ${doctorId} not found for verification`);
      return;
    }

    if (!doctor.documentId) {
      this.logger.warn(`Doctor ${doctorId} has no documentId — cannot verify`);
      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          verificationStatus: 'PENDING',
          lastVerifiedAt: new Date(),
        },
      });
      return;
    }

    const now = new Date();
    try {
      const result = await this.verifyByDocument(doctor.documentType as string, doctor.documentId);

      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          verificationStatus: result.found ? 'VERIFIED' : 'NOT_FOUND',
          verifiedAt: result.found ? now : undefined,
          lastVerifiedAt: now,
          lastSacsResponse: result.rawHtml ?? null,
        },
      });

      this.logger.log(
        `Doctor ${doctorId} verification: ${result.found ? 'VERIFIED' : 'NOT_FOUND'}`,
      );
    } catch (error) {
      this.logger.error(
        `SACS verification failed for doctor ${doctorId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.prisma.doctor.update({
        where: { id: doctorId },
        data: {
          verificationStatus: 'PENDING',
          lastVerifiedAt: now,
          lastSacsResponse: `ERROR: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  buildXajaxBody(documentType: string, documentId: string): string {
    const timestamp = Date.now();
    return `xajax=getPrfsnalByCed&xajaxr=${timestamp}&xajaxargs[]=${encodeURIComponent(`${documentType}-${documentId}`)}`;
  }

  parseResponse(rawXml: string): SacsQueryResult {
    try {
      // SACS returns XML with JS commands containing JSON data
      // Extract data from xajax_userTable and xajax_tableProfesion calls
      const userMatch = rawXml.match(/xajax_userTable\('([^']+)'\)/);
      const profMatch = rawXml.match(/xajax_tableProfesion\('([^']+)'\)/);

      if (!userMatch && !profMatch) {
        return { found: false, rawHtml: rawXml };
      }

      let doctorName: string | undefined;
      let specialty: string | undefined;
      let licenseNumber: string | undefined;

      if (userMatch && userMatch[1]) {
        try {
          const userData = JSON.parse(userMatch[1]);
          const nombre = userData.nombre1 || '';
          const apellido = userData.apellido1 || '';
          if (nombre || apellido) {
            doctorName = `${nombre} ${apellido}`.trim();
          }
        } catch {
          // Ignore parse errors
        }
      }

      if (profMatch && profMatch[1]) {
        try {
          const profData = JSON.parse(profMatch[1]);
          if (Array.isArray(profData) && profData.length > 0) {
            const prof = profData[0];
            specialty = prof.profesion || undefined;
            licenseNumber = prof.licencia || undefined;
          }
        } catch {
          // Ignore parse errors
        }
      }

      const found = !!doctorName || !!specialty;

      return {
        found,
        doctorName,
        specialty,
        licenseNumber,
        rawHtml: rawXml,
      };
    } catch (error) {
      this.logger.error(`Failed to parse SACS response: ${error instanceof Error ? error.message : String(error)}`);
      return { found: false, rawHtml: rawXml };
    }
  }

  private async querySacs(body: string): Promise<SacsQueryResult> {
    const cookies = await this.getSessionCookies();

    this.logger.log('body ', body);
    return new Promise((resolve, reject) => {
      const url = new URL(SACS_ENDPOINT);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          Cookie: cookies,
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          Origin: 'https://sistemas.sacs.gob.ve',
          Referer: 'https://sistemas.sacs.gob.ve/consultas/prfsnal_salud',
          Accept: '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'es-VE,es;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15_000,
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const encoding = res.headers['content-encoding'];

          if (encoding === 'gzip') {
            zlib.gunzip(buffer, (err, decoded) => {
              if (err) {
                this.logger.error(
                  `Failed to decompress SACS response: ${err.message}`,
                );
                reject(err);
              } else {
                resolve(this.parseResponse(decoded.toString('utf8')));
              }
            });
          } else {
            resolve(this.parseResponse(buffer.toString('utf8')));
          }
        });
      });

      req.on('error', (error) => {
        this.logger.error(`SACS request failed: ${error.message}`);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SACS request timed out'));
      });

      req.write(body);
      req.end();
    });
  }

  private async getSessionCookies(): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(SACS_ENDPOINT);
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-VE,es;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 10_000,
        rejectUnauthorized: false,
      };

      const req = https.request(options, (res) => {
        res.resume();
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          resolve(setCookie.map((c) => c.split(';')[0]).join('; '));
        } else {
          resolve('');
        }
      });

      req.on('error', (error) => {
        this.logger.error(`Failed to get SACS session: ${error.message}`);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('SACS session request timed out'));
      });

      req.end();
    });
  }

  async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
    this.logger.debug(`Delaying ${delay}ms before next SACS request`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
