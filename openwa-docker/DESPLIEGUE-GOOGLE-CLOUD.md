# Desplegar open-wa en Google Cloud

Guía para poner el bot de WhatsApp de la barbería (open-wa + `bot.js`) en una VM de Google Cloud
usando la prueba gratuita de 300 USD por 90 días.

**Costo estimado:** unos 30 USD/mes con `e2-medium`, cubiertos por el crédito.
**No pulses "Activate full account"** si quieres seguir solo con la prueba.

El bot solo hace conexiones de salida (hacia WhatsApp y hacia Render), así que **no hay que abrir
ningún puerto** además del SSH que Google trae por defecto.

## ¿Estoy en mi PC o en el servidor?

Mira el texto antes del cursor en la terminal:

| Ves esto | Estás en |
|---|---|
| `develop@davids-IdeaPad-Slim-3-15IRH10:~$` | Tu PC |
| `develop@barberia-openwa:~$` | El servidor |

- Entrar al servidor: `ssh barberia`
- Volver al PC: `exit`
- Los comandos `docker compose` se ejecutan **dentro de `~/openwa-docker`** en el servidor. Si no,
  sale el error `no configuration file provided: not found`.
- Pega los comandos del servidor **después** de ver su prompt, no junto con `ssh barberia`.

## 1. Crear la cuenta y el proyecto

1. Entra en <https://cloud.google.com/free> y regístrate. La tarjeta es solo para verificar.
2. Crea un proyecto llamado `barberia-openwa`.
3. Ve a **☰ → Compute Engine → Instancias de VM** y habilita la API si te lo pide.

## 2. Crear la clave SSH (en tu PC)

```bash
ssh-keygen -t ed25519 -f ~/.ssh/gcp_barberia -N ""
cat ~/.ssh/gcp_barberia.pub
```

Copia la línea completa que empieza por `ssh-ed25519`.

La clave queda sin passphrase, así que protege el archivo: quien acceda a tu sesión del PC podría
entrar a la VM.

## 3. Crear la VM

Pulsa **Crear instancia**:

| Sección | Valor |
|---|---|
| Nombre | `barberia-openwa` |
| Región | `us-east1` o `us-central1` |
| Máquina | Serie **E2**, tipo **e2-medium** (2 vCPU, 4 GB) |
| Disco de arranque | **Ubuntu 24.04 LTS x86/64** o Debian, de **30 GB** |
| Redes | Sin HTTP ni HTTPS; IP externa **Efímera** |
| Seguridad → Llaves SSH | Pega la línea `ssh-ed25519...` |

Google crea el usuario según el final de la clave, por eso será `develop`, no `ubuntu`.

La **IP externa** está en la columna *IP externa* de la lista de instancias. No la confundas con:

- La IP interna (`10.x.x.x`), que solo sirve dentro de Google.
- La IP pública de tu internet de casa. La de Google suele empezar por `34.` o `35.`.

## 4. Configurar la conexión (en tu PC)

Cambia `TU_IP_EXTERNA`:

```bash
cat >> ~/.ssh/config <<'EOF'

Host barberia
  HostName TU_IP_EXTERNA
  User develop
  IdentityFile ~/.ssh/gcp_barberia
  IdentitiesOnly yes
EOF

ssh barberia
```

La primera vez responde `yes`.

## 5. Instalar Docker (en el servidor)

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
mkdir -p ~/openwa-docker
exit
```

Vuelve a entrar con `ssh barberia` para que se aplique el permiso de Docker.

Comprueba que todo esté bien:

```bash
uname -m; nproc; free -h | grep Mem; df -h /; docker ps
```

Debe mostrar `x86_64`, `2` CPU, cerca de `3.8Gi` de memoria, cerca de `29G` de disco y `docker ps`
sin errores.

Si el disco sale con 9.7 GB, amplíalo: abre el disco de la instancia, pulsa **Editar**, pon **30**,
guarda y ejecuta `sudo reboot`.

## 6. Copiar los archivos y apagar lo local (en tu PC)

```bash
cd ~/Escritorio/barberIA/openwa-docker
scp docker-compose.yml Dockerfile wa.config.json barberia:~/openwa-docker/
scp ~/Escritorio/claude-whastapp/bot.js barberia:~/openwa-docker/bot.js
docker compose down
```

Cierra también cualquier `start.sh` o `node bot.js` abierto. Con dos bots activos, cada mensaje se
responde dos veces.

## 7. Arrancar (en el servidor)

```bash
cd ~/openwa-docker
echo 'BOT_JS=./bot.js' > .env
docker compose up -d --build
docker compose ps
```

El build tarda varios minutos.

## 8. Vincular WhatsApp

No escanees el QR de los logs: suele estar vencido y la terminal lo deforma. Usa el panel web.

1. En una **terminal nueva de tu PC**, abre el túnel y déjalo abierto (no muestra nada):
   ```bash
   ssh -N -L 8081:127.0.0.1:8081 barberia
   ```
2. Abre <http://127.0.0.1:8081/dashboard/>.
3. En el teléfono: **WhatsApp → Dispositivos vinculados → Vincular dispositivo** y escanea.
4. Elimina de esa lista las sesiones antiguas.
5. Cierra el panel y pulsa `Ctrl+C` en el túnel. El panel abierto consume cupo de la API.

No abras el puerto 8081 a internet: quien entre al panel controla tu WhatsApp.

## 9. Probar (en el servidor)

```bash
cd ~/openwa-docker
docker compose logs -f bot
```

Debe aparecer `✅ Bot escuchando mensajes`. Escribe "hola" desde **otro número** y deben salir `📩` y
`📤`. La primera respuesta puede tardar unos 50 s si Render está dormido. Sal con `Ctrl+C`.

## Uso diario (en el servidor, dentro de `~/openwa-docker`)

| Qué | Comando |
|---|---|
| Ver estado | `docker compose ps` |
| Logs del bot | `docker compose logs -f bot` |
| Logs de open-wa | `docker compose logs --tail=50 openwa` |
| Reiniciar | `docker compose restart` |
| Parar | `docker compose down` (sin `-v`, para no borrar la sesión) |
| Espacio en disco | `df -h /` |

Los contenedores vuelven a arrancar solos si la VM se reinicia.

### Actualizar `bot.js`

En tu PC:

```bash
scp ~/Escritorio/claude-whastapp/bot.js barberia:~/openwa-docker/bot.js
```

En el servidor:

```bash
cd ~/openwa-docker && docker compose restart bot
```

## Copia de la sesión de WhatsApp

En el servidor:

```bash
cd ~/openwa-docker && mkdir -p ~/backups
docker compose stop openwa
docker run --rm -v openwa-docker_openwa-session:/data -v ~/backups:/backup alpine \
  tar czf /backup/sesion-$(date +%F).tar.gz -C /data .
docker compose start openwa
```

En tu PC:

```bash
scp 'barberia:~/backups/*.tar.gz' ~/Escritorio/
```

Guárdala en un lugar privado y fuera de git: quien la tenga puede usar tu WhatsApp.

Para restaurarla en otro servidor, con el archivo en `~/backups` y antes de arrancar los contenedores
(cambia el nombre del archivo):

```bash
docker volume create openwa-docker_openwa-session
docker run --rm -v openwa-docker_openwa-session:/data -v ~/backups:/backup alpine \
  tar xzf /backup/sesion-AAAA-MM-DD.tar.gz -C /data
```

Si la sesión no sirve, vincula de nuevo con el paso 8.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `ssh barberia` se queda colgado | Revisa que `HostName` en `~/.ssh/config` sea la IP externa de la VM y que esté encendida |
| Pide "desbloquear" una clave | La clave tiene passphrase. Si no la recuerdas, crea otra (paso 2) y cámbiala en la VM: **Editar → Llaves SSH → Agregar elemento** |
| `Permission denied (publickey)` | La clave no está en la VM o no coincide con la de `~/.ssh/config` |
| `no configuration file provided` | No estás en la carpeta: `cd ~/openwa-docker` |
| `permission denied` al usar Docker | Ejecuta `exit` y vuelve a entrar con `ssh barberia` |
| `⚠️ Sin conexión con la API` al arrancar | Es normal mientras open-wa inicia; espera 1 o 2 minutos |
| El puerto 8081 está ocupado al abrir el túnel | Sigue activo el contenedor local: `docker compose down` en tu PC |
| Cada mensaje se responde dos veces | Hay otro bot activo en tu PC |
| Cambió la IP de la VM | Pasa al apagarla y encenderla; actualiza `HostName`. El bot no se ve afectado |

## Antes de que termine la prueba

- Los 90 días terminan cerca del **7 de febrero de 2027** si la cuenta se creó el 9 de noviembre de 2026.
  Confirma la fecha exacta en **Facturación** de Google Cloud.
- Hacia el **25 de enero de 2027**, decide a dónde migrar: Oracle Always Free, un equipo en casa o un
  VPS barato.
- Haz una copia de la sesión antes de migrar.
- open-wa no es oficial y esta es una IP de centro de datos: usa un número que puedas permitirte
  perder y mantén el canal de Meta como respaldo.
