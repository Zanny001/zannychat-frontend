package expo.modules.zannychatcallmapping

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Encrypts the call-scoped bearer credential with a non-exportable Android
 * Keystore AES key. SharedPreferences contains ciphertext only; the key is
 * device-bound and is not included in Android app-data backups.
 */
object NativeCallMappingCrypto {
  private const val KEY_ALIAS = "zannychat.native-call-mapping.v1"
  private const val TRANSFORMATION = "AES/GCM/NoPadding"
  private const val IV_LENGTH = 12

  private fun key(): SecretKey {
    val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    generator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true)
        .build(),
    )
    return generator.generateKey()
  }

  fun encrypt(plainText: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, key())
    val encrypted = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
    val combined = cipher.iv + encrypted
    return Base64.encodeToString(combined, Base64.NO_WRAP)
  }

  fun decrypt(cipherText: String): String {
    val combined = Base64.decode(cipherText, Base64.NO_WRAP)
    require(combined.size > IV_LENGTH) { "Invalid encrypted native call mapping" }
    val iv = combined.copyOfRange(0, IV_LENGTH)
    val encrypted = combined.copyOfRange(IV_LENGTH, combined.size)
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
    return String(cipher.doFinal(encrypted), Charsets.UTF_8)
  }
}
