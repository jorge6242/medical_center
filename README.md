# Centro Médico

Sistema de gestión para centro médico: pacientes, consultas, pagos, doctores y gastos operativos.

## Publicar imágenes en Docker Hub y Railway

Las imágenes de producción se construyen para `linux/amd64`, se publican en la cuenta `jorge6242` y el frontend queda configurado para consumir la API de Railway.

Elegí un tag nuevo por cada release y ejecutá el comando correspondiente desde la raíz del proyecto:

```bash
# API: construye y publica jorge6242/centro-medico-api:<tag>
make docker-release-api IMAGE_TAG=railway-YYYYMMDD-NN

# Web: construye y publica jorge6242/centro-medico-web:<tag>
make docker-release-web IMAGE_TAG=railway-YYYYMMDD-NN
```

Por ejemplo:

```bash
make docker-release-api IMAGE_TAG=railway-20260920-06
make docker-release-web IMAGE_TAG=railway-20260920-06
```

> Antes de publicar, iniciá sesión en Docker Hub con `docker login`. Luego actualizá el tag configurado en Railway o redeployá el servicio que use ese tag.

### Release controlado

Para publicar imágenes nuevas y actualizar Railway sin editar tags manualmente, usá el script de release con un tag nuevo e inmutable:

```bash
./scripts/release.sh --tag railway-20260925-01
```

El script construye ambas imágenes desde una copia temporal del commit `HEAD` fijado al iniciar. Podés mantener cambios pendientes: los cambios staged, unstaged y archivos sin seguimiento no se publican ni se modifican. La copia temporal se elimina al finalizar, incluso si el release falla. Los comandos `make docker-release-*` directos siguen usando los archivos locales.

Publica API antes que web, actualiza la imagen de cada servicio con Railway CLI y verifica sus endpoints. Para inspeccionar el release sin modificar infraestructura:

```bash
./scripts/release.sh --tag railway-20260925-01 --dry-run
```
