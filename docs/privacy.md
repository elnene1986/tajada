# Política de Privacidad de Tajada

**Última actualización:** 26 de mayo de 2026

## Resumen en una frase

Tajada procesa toda tu información financiera **en tu dispositivo**. No tenemos servidores que guarden tus transacciones, no enviamos tus datos a terceros, y no podemos ver tus pagos, comercios, ni reglas. Si nos pides un respaldo, lo ciframos con tu frase secreta antes de salir de tu teléfono.

## Qué información maneja Tajada

Cuando usas Tajada, la app procesa los siguientes datos **únicamente en tu dispositivo**:

- Las transacciones que importas (archivos CSV, OFX o QFX de tu banco, Stripe, PayPal, Venmo, Patreon, OnlyFans, u otras plataformas)
- Las reglas de clasificación que vas creando cuando marcas comercios como negocio o personal
- Las categorías que asignas a cada transacción
- La marca de si completaste la pantalla de bienvenida
- La fecha de tu último respaldo cifrado
- Las fotos de recibos que decidas adjuntar a una transacción (se guardan en una carpeta privada dentro de la app)
- Tus preferencias de estimación de impuestos, recordatorios trimestrales, oficina en casa y formularios 1099-K que ingreses manualmente

Toda esta información se guarda en el almacenamiento privado de la app dentro de tu teléfono. No se transmite a Tajada ni a ningún otro servicio.

## Qué información NO recolectamos

Tajada **no recolecta ni transmite**:

- Tus transacciones financieras
- Los nombres, montos o fechas de tus pagos
- Tu información de cuentas bancarias, tarjetas de crédito o plataformas
- Tu ubicación
- Tus contactos
- Identificadores publicitarios
- Análisis de uso, eventos de aplicación, ni telemetría
- Tu correo electrónico (salvo que tú nos escribas voluntariamente para soporte)

No usamos cookies, píxeles de rastreo, ni servicios de analítica (no usamos Google Analytics, Firebase Analytics, Mixpanel, ni nada similar).

## Respaldos cifrados

Tajada incluye una función opcional de respaldo cifrado. Cuando creas un respaldo:

1. La app reúne tus sesiones y reglas en un solo archivo.
2. Se cifra ese archivo con AES-256-GCM usando una clave derivada de **tu frase secreta** (mediante PBKDF2-SHA256 con 250,000 iteraciones).
3. Tú decides dónde guardar el archivo cifrado: iCloud Drive, Google Drive, correo electrónico, AirDrop, o donde prefieras.

**Importante:** Tu frase secreta nunca sale de tu teléfono y nosotros no la conocemos. Si pierdes u olvidas la frase, **el respaldo no se puede recuperar**. Esto es intencional — no podemos tener una "puerta trasera" para recuperar tu información porque eso comprometería la privacidad de todos los usuarios.

## Compartir archivos (PDF y CSV)

Cuando exportas un PDF o CSV con tus datos, Tajada crea el archivo en tu teléfono y abre el menú nativo del sistema operativo (iOS o Android) para que tú elijas a dónde enviarlo. Lo que hagas después con ese archivo está fuera del alcance de Tajada — depende de la app que elijas para compartirlo (correo, iCloud, Drive, etc.) y sus respectivas políticas.

## Permisos del sistema

Tajada solicita los siguientes permisos:

- **Acceso a archivos:** para que tú puedas seleccionar e importar tus estados de cuenta cuando lo desees. No leemos archivos sin tu acción explícita.
- **Compartir:** para abrir el menú de exportación cuando exportas un PDF, CSV o respaldo.
- **Cámara y fotos:** solo si decides adjuntar la foto de un recibo a una transacción. La imagen se copia a una carpeta privada dentro de la app, en tu teléfono. **No se sube a ningún servidor ni se transmite a nadie.** Si no usas la función de recibos, nunca se solicita este permiso.
- **Notificaciones:** solo si activas los recordatorios de impuestos trimestrales. Son notificaciones **locales** programadas en tu teléfono (sin servidor de envío y sin identificadores) que te avisan antes de cada fecha límite del IRS. Puedes desactivarlas cuando quieras.

Tajada **no solicita** acceso a tu micrófono, ubicación, contactos ni calendario. Las fotos de recibos y las notificaciones descritas arriba son opcionales y solo se activan por tu propia acción.

## Niños

Tajada está diseñada para adultos que generan ingresos como trabajadores independientes (1099) en Estados Unidos. No está dirigida a menores de 13 años y no recolectamos a sabiendas información de menores de edad.

## Cambios a esta política

Si cambiamos esta política en una versión futura de Tajada, actualizaremos la fecha "Última actualización" arriba y publicaremos los cambios aquí. Para cambios importantes, también lo mencionaremos en las notas de la nueva versión en la App Store y Google Play.

## Contacto

Para preguntas sobre privacidad o sobre cómo Tajada maneja tus datos:

**Correo:** tajada.soporte@gmail.com

## Avisos legales

Tajada es una herramienta para organizar tus transacciones financieras en categorías compatibles con el Schedule C del IRS. **Tajada no es un preparador de impuestos** ni un servicio de presentación de declaraciones fiscales. Los reportes que genera son para tu uso o el de tu contador — la responsabilidad de presentar declaraciones precisas ante el IRS es tuya o de tu preparador autorizado.
