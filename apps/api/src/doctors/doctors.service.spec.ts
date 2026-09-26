import { DoctorsService } from './doctors.service';

describe('DoctorsService doctor service pricing', () => {
  it('clears the default bank account number when an empty value is submitted', async () => {
    const transaction = {
      doctor: {
        updateMany: jest.fn(),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          id: 'doctor-1',
          name: 'Dra. Pérez',
          splitPercentage: 70,
        }),
      },
      doctorBankAccount: { updateMany: jest.fn() },
    };
    const prisma = {
      doctor: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'doctor-1',
            documentType: 'V',
            documentId: '11111111',
            medicalLicenseNumber: null,
          })
          .mockResolvedValueOnce(null),
      },
      $transaction: jest.fn(async (callback) => callback(transaction)),
    };
    const service = new DoctorsService(prisma as never, {} as never);
    jest.spyOn(service, 'findOne').mockResolvedValue({} as never);

    await service.update('tenant-1', 'doctor-1', {
      documentType: 'E',
      documentId: '12345678',
      bankAccount: {
        bankName: 'Banesco',
        accountType: 'CHECKING',
        accountNumber: '',
        documentId: '12345678',
        phone: '',
      },
    });

    expect(transaction.doctorBankAccount.updateMany).toHaveBeenCalledWith({
      where: {
        doctorId: 'doctor-1',
        isActive: true,
        isDefault: true,
        doctor: { tenantId: 'tenant-1' },
      },
      data: {
        bankName: 'Banesco',
        accountType: 'CHECKING',
        accountNumber: null,
        documentId: '12345678',
        phone: null,
      },
    });
    expect(transaction.doctor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentType: 'E',
          documentId: '12345678',
        }),
      }),
    );
  });

  it('returns only the tenant-scoped services assigned to the doctor', async () => {
    const prisma = {
      doctor: {
        findFirst: jest.fn().mockResolvedValue({ id: 'doctor-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          doctorServices: [
            {
              id: 'doctor-service-1',
              specialtyId: 'specialty-1',
              serviceId: 'service-1',
              priceUsd: { toString: () => '75.00' },
              specialty: { name: 'Cardiología' },
              service: { name: 'Consulta' },
            },
          ],
        }),
      },
    };
    const service = new DoctorsService(prisma as never, {} as never);

    await expect(
      service.getDoctorServices('tenant-1', 'doctor-1'),
    ).resolves.toEqual([
      {
        id: 'doctor-service-1',
        specialtyId: 'specialty-1',
        specialtyName: 'Cardiología',
        serviceId: 'service-1',
        serviceName: 'Consulta',
        priceUsd: '75.00',
      },
    ]);
  });

  it('rejects a missing doctor before reading assigned services', async () => {
    const prisma = {
      doctor: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new DoctorsService(prisma as never, {} as never);

    await expect(
      service.getDoctorServices('tenant-1', 'missing'),
    ).rejects.toThrow('Doctor missing no encontrado');
  });

  it('finds doctors by configured service specialty, not by their base specialty', async () => {
    const prisma = {
      specialty: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'specialty-2',
          name: 'Pediatría',
        }),
      },
      doctor: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new DoctorsService(prisma as never, {} as never);

    await service.findBySpecialty('tenant-1', 'specialty-2');

    expect(prisma.doctor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          doctorServices: {
            some: { tenantId: 'tenant-1', specialtyId: 'specialty-2' },
          },
        }),
      }),
    );
  });
});
