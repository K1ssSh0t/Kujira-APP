# 🐛 MyAnimeList Auth Debugging Guide

## Error: "Authentication Failed"

Si recibes el error "Authentication Failed", sigue estos pasos para identificar el problema:

## 📋 Checklist de Verificación

### 1. Revisa la Consola de Desarrollo

Abre la consola y busca los siguientes logs:

```
[Auth Callback] Received params: { code: "...", ... }
[Auth Callback] Authorization code received: ...
[Auth Callback] Code verifier retrieved: YES/NO
[MAL Auth] Exchange params:
[MAL Auth] Token exchange failed:
```

### 2. Problemas Comunes y Soluciones

#### ❌ Error: "No authorization code received"

**Causa:** El redirect URI no coincide o MAL rechazó la autorización.

**Solución:**
1. Verifica el Redirect URI en MAL Developer Portal
2. Para Expo Go dev: `exp://[TU-IP]:8081/--/auth-callback`
3. Para build producción: `kujira-app://auth-callback`

#### ❌ Error: "PKCE verifier not found"

**Causa:** El code verifier no se guardó antes de abrir el browser.

**Solución:**
1. Asegúrate de guardar las credenciales ANTES de conectar
2. Intenta desconectar y volver a conectar
3. Limpia el caché de la app

**Comandos para limpiar:**
```bash
# En la consola de Expo
Shift + m  # Abrir menú
Luego seleccionar "Clear cache and restart"
```

#### ❌ Error: "Token exchange failed: invalid_grant"

**Causa:** El code ya fue usado, expiró, o el code_verifier no coincide.

**Soluciones:**
1. **Código ya usado:** Vuelve a iniciar el flujo OAuth completo
2. **Code expiró:** MAL codes expiran en ~60 segundos. Debes completar el flujo rápido
3. **Verifier no coincide:** Asegúrate de que el mismo verifier que se usó para generar el challenge se use en el intercambio

**Cómo solucionarlo:**
```javascript
// Verifica en Config que se guarde el verifier ANTES de abrir browser
await savePKCEVerifier(pkce.codeVerifier);  // ← Debe estar ANTES de initiateMALAuth
await initiateMALAuth(clientId.trim(), pkce);
```

#### ❌ Error: "Token exchange failed: invalid_client"

**Causa:** Client ID o Client Secret incorrectos.

**Solución:**
1. Verifica que el Client ID sea correcto (copia/pega del MAL Developer Portal)
2. Verifica que el Client Secret sea correcto
3. Asegúrate de NO tener espacios antes/después

#### ❌ Error: "Token exchange failed: invalid_request"

**Causa:** Faltan parámetros requeridos o redirect_uri no coincide.

**Solución:**
1. El redirect_uri en el intercambio DEBE ser exactamente igual al usado en la autorización
2. Verifica que todos los parámetros se estén enviando correctamente

## 🔍 Debug Logs Detallados

Con el código actualizado, deberías ver estos logs:

### Flujo Exitoso:
```
[Config] Generating PKCE...
[Config] PKCE verifier saved
[MAL Auth] Redirect URI: kujira-app://auth-callback
[MAL Auth] Code Challenge: abc123...
(Browser opens, user authorizes)
[Auth Callback] Received params: { code: "xyz789..." }
[Auth Callback] Authorization code received: xyz789...
[Auth Callback] Code verifier retrieved: YES
[MAL Auth] Exchange params:
  - Redirect URI: kujira-app://auth-callback
  - Code (first 10 chars): xyz789abcd
  - Code Verifier (first 10 chars): abc123defg
  - Client ID: 1234567890abcdef
  - Has Client Secret: true
[MAL Auth] Exchanging code for token...
[MAL Auth] Token exchange successful
[Auth Callback] Token exchange successful
✅ Connected Successfully
```

### Flujo con Error:
```
[Auth Callback] Received params: { code: "xyz789..." }
[Auth Callback] Authorization code received: xyz789...
[Auth Callback] Code verifier retrieved: YES
[MAL Auth] Exchange params: ...
[MAL Auth] Token exchange failed:
  - Status: 400
  - Data: { error: "invalid_grant", error_description: "..." }
  - Message: Request failed with status code 400
❌ Authentication Failed: Token exchange failed: invalid_grant
```

## 🛠️ Pasos de Solución por Error

### Si ves "invalid_grant":
1. Borra la app de tus aplicaciones autorizadas en MAL:
   - Ve a: https://myanimelist.net/apiconfig
   - Elimina cualquier autorización previa de Kujira
2. En la app, ve a Config → Disconnect (si está conectado)
3. Cierra completamente la app
4. Vuelve a abrir la app
5. Conecta nuevamente

### Si ves "invalid_client":
1. Ve a MAL Developer Portal: https://myanimelist.net/apiconfig
2. Copia nuevamente el Client ID (asegúrate de copiar TODO)
3. Si estás usando Client Secret, cópialo también
4. En la app: Config → Pega las credenciales → Save
5. Intenta conectar nuevamente

### Si el browser no redirige a la app:
1. **En Expo Go:** Esto es normal, copia manualmente el código del URL
2. **En build:** Verifica que el scheme esté configurado en app.json

## 📱 Verificar Redirect URI Correcto

### Para saber qué Redirect URI usar:

1. Ejecuta este código en la consola de tu app:
```javascript
import * as AuthSession from 'expo-auth-session';
console.log(AuthSession.makeRedirectUri({ scheme: "kujira-app", path: "auth-callback" }));
```

2. Usa ese EXACTO redirect URI en MAL Developer Portal

### Expo Go (Desarrollo):
```
exp://192.168.1.XXX:8081/--/auth-callback
```

### Build Standalone:
```
kujira-app://auth-callback
```

## 🔄 Flujo Completo para Debugging

1. **Antes de conectar:**
   ```javascript
   // Verifica que tengas credenciales guardadas
   import { loadSyncConfig } from '~/lib/sync/config';
   const config = await loadSyncConfig();
   console.log('Config:', config?.mal?.clientId);
   ```

2. **Durante la conexión:**
   - Abre la consola ANTES de presionar "Connect"
   - Presiona "Connect with MAL"
   - Observa los logs en tiempo real

3. **Después del redirect:**
   - La pantalla auth-callback debe aparecer
   - Observa los logs detallados
   - Si hay error, copia el mensaje completo

## 📞 Información para Reportar Bug

Si el problema persiste, reporta con:

1. Logs completos de consola
2. Versión de Expo y React Native
3. Plataforma (iOS/Android/Web)
4. ¿Usas Expo Go o build standalone?
5. Captura de pantalla del error
6. Redirect URI que estás usando

---

**Tip:** La mayoría de los problemas se solucionan verificando que el Redirect URI sea EXACTAMENTE el mismo en:
1. MAL Developer Portal
2. Código de initiateMALAuth
3. Código de exchangeCodeForToken
