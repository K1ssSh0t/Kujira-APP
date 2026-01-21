# MyAnimeList Integration - Setup Guide

## ✅ Implementation Complete!

La integración de MyAnimeList ha sido implementada exitosamente en Kujira-APP. 

## 📁 Archivos Creados

```
lib/sync/
├── types.ts          # Tipos e interfaces
├── config.ts         # Gestión de AsyncStorage + PKCE
├── mal-client.ts     # Cliente OAuth2 + API MAL
├── matcher.ts        # Algoritmo de matching de títulos
├── service.ts        # Servicio de sincronización
├── hooks.ts          # React hooks para UI
└── index.ts          # Exports públicos

app/
└── auth-callback.tsx # Pantalla de callback OAuth
```

## 🔧 Configuración Necesaria

### 1. Crear Aplicación en MyAnimeList

1. Ve a: https://myanimelist.net/apiconfig
2. Crea una nueva aplicación
3. Configura los siguientes campos:
   - **App Name**: Kujira APP
   - **App Type**: web
   - **App Redirect URL**: `kujira-app://auth-callback`
   - **Homepage URL**: (opcional)
   - **App Description**: Anime tracking app with MAL sync
   
4. Guarda y obtén tu **Client ID** y **Client Secret**

### 2. Configurar en la App

1. Abre la app Kujira
2. Ve a la pestaña **Config**
3. Ingresa tu **Client ID** (requerido)
4. Ingresa tu **Client Secret** (opcional pero recomendado)
5. Presiona **Save Credentials**
6. Presiona **Connect with MyAnimeList**
7. Autoriza la aplicación en el navegador
8. ¡Listo! Ya estás conectado

## 🚀 Funcionalidades Implementadas

### ✅ Sincronización Automática

**Al ver un episodio:**
- Se actualiza automáticamente el progreso en MAL
- Si es el último episodio, marca el anime como "Completed"
- Si es el primer episodio, marca como "Watching"

**Al agregar a biblioteca:**
- Se sincroniza el estado automáticamente
- Watching → watching
- Plan to Watch → plan_to_watch
- Completed → completed
- On Hold → on_hold
- Dropped → dropped

### ✅ Sincronización Manual

En la pestaña **Config**:
- **Sync History**: Sincroniza todo el historial de episodios
- **Sync Library**: Sincroniza toda la biblioteca
- **Sync All Data**: Sincroniza todo (historial + biblioteca)

### ✅ Matching Inteligente

El algoritmo de matching:
- Normaliza títulos (lowercase, sin caracteres especiales)
- Compara con título principal, EN, JP y sinónimos
- Usa fuzzy matching con score de confianza
- Solo acepta matches con score > 0.3 (30%)

## 🔐 Seguridad

- Tokens almacenados en AsyncStorage (encriptado en iOS)
- Auto-refresh de access token cuando expira
- Credenciales nunca se envían en logs
- Client Secret es opcional (PKCE flow)

## 📱 Flujo de Usuario

```
1. Usuario abre Config
2. Ingresa Client ID/Secret → Guardar
3. Presiona "Connect with MAL"
4. Se genera PKCE verifier/challenge y se guarda
5. Se abre browser con login de MAL
6. Usuario autoriza
7. Redirect automático a kujira-app://auth-callback?code=...
8. Pantalla auth-callback procesa:
   - Obtiene el code del URL
   - Recupera el verifier de AsyncStorage
   - Intercambia code + verifier por tokens
   - Obtiene info del usuario
   - Guarda tokens
   - Limpia verifier
9. Redirect a Config
10. Tokens guardados ✓
11. Sincronización habilitada ✓
```

## 🐛 Debugging

Logs disponibles en consola (solo en desarrollo):

```javascript
[MAL Auth] Redirect URI: ...
[MAL Auth] Token exchange successful
[MAL API] Updated anime 12345: ...
[Matcher] Matched "One Piece" to "One Piece" (score: 1.0)
[Sync Service] Syncing episode 1000 of "One Piece"
```

## ⚠️ Limitaciones Conocidas

1. **No sincroniza eliminaciones** - Si eliminas un anime de la biblioteca local, NO se elimina de MAL
2. **Solo push a MAL** - No sincroniza desde MAL hacia local (pull)
3. **Sin retry queue** - Si falla el sync, no se reintenta automáticamente
4. **Matching imperfecto** - Títulos muy diferentes pueden no coincidir

## 🧪 Testing Checklist

- [ ] Conectar cuenta MAL en Config
- [ ] Ver un episodio → Verificar en MAL que se actualizó
- [ ] Agregar anime a biblioteca → Verificar en MAL
- [ ] Cambiar estado de anime → Verificar en MAL
- [ ] Sync manual de historial → Verificar resultados
- [ ] Sync manual de biblioteca → Verificar resultados
- [ ] Desconectar cuenta → Verificar que limpia datos

## 📝 Notas Importantes

### Deep Linking

- **Expo Go (dev)**: Usa `exp://` scheme automáticamente
- **Build standalone**: Usa `kujira-app://` scheme
- El sistema detecta automáticamente el entorno correcto

### Redirect URI en MAL Developer Portal

Para desarrollo con Expo Go:
```
exp://[TU-IP]:8081/--/auth-callback
```

Para producción (build):
```
kujira-app://auth-callback
```

**Importante:** Actualmente el app.json está configurado con `kujira-app://`, que funciona para builds. Si vas a testear con Expo Go en desarrollo, necesitarás usar el redirect URI dinámico que Expo genera.

## 🆘 Solución de Problemas

**Error: "Not authenticated"**
- Verifica que guardaste las credenciales
- Presiona "Connect with MyAnimeList"
- Revisa que el Client ID sea correcto

**Error: "Token exchange failed"**
- Verifica el Client Secret (si lo usaste)
- Revisa que el Redirect URI coincida exactamente
- Intenta desconectar y volver a conectar

**Error: "No match found"**
- El título del anime es muy diferente en MAL
- Busca manualmente el anime en MAL para ver el título exacto
- Reporta el caso para mejorar el algoritmo de matching

**Sync no funciona automáticamente**
- Verifica que estés conectado (Config → Connection Status)
- Revisa los logs de consola para ver errores
- El sync falla silenciosamente para no interrumpir la experiencia

## 📚 Recursos

- [MyAnimeList API Docs](https://myanimelist.net/apiconfig/references/api/v2)
- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [OAuth2 PKCE Flow](https://oauth.net/2/pkce/)

## ✨ Próximas Mejoras (Futuras)

- [ ] Pull bidireccional (MAL → Local)
- [ ] Queue de retry offline
- [ ] Corrección manual de matches dudosos
- [ ] Sincronizar scores/ratings
- [ ] Sincronizar fechas de inicio/fin
- [ ] Export/import de biblioteca completa
- [ ] Notificaciones push cuando MAL se actualiza

---

**¡La integración está completa y lista para usar!** 🎉

Para cualquier problema o sugerencia, revisa los logs de consola en modo desarrollo.
