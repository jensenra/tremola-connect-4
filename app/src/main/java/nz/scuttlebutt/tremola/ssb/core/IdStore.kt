package nz.scuttlebutt.tremola.ssb.core

import android.content.Context
import android.util.Base64
import android.util.Log
import org.json.JSONObject
import java.io.FileOutputStream

import nz.scuttlebutt.tremola.utils.HelperFunctions.Companion.toBase64

/**
 * The identity of the user.
 * Read from a (secret) file if possible, otherwise create a new ID
 */
class IdStore(private val context: Context) {

    var identity: SSBid

    init {
        val id = readFromFile()
        if (id == null) {
            Log.d("IdStore init", "no secret found")
            identity = SSBid() // create
            writeToFile(identity)
        } else
            identity = id
    }

    private fun writeToFile(newId: SSBid): Boolean {
        val jsonSecret: String = "# this is your SECRET name.\n" +
                "# this name gives you magical powers.\n" +
                "# with it you can mark your messages so that your friends can verify\n" +
                "# that they really did come from you.\n" +
                "#\n" +
                "# if any one learns this name, they can use it to destroy your identity\n" +
                "# NEVER show this to anyone!!!\n" +
                "\n" +
                "{\n" +
                "  \"curve\": \"ed25519\",\n" +
                "  \"public\": \"${newId.verifyKey.toBase64()}\",\n" +
                "  \"private\": \"${newId.signingKey!!.toBase64()}\",\n" +
                "  \"id\": \"${newId.toRef()}\"\n" +
                "}\n" +
                "\n" +
                "# WARNING! It's vital that you DO NOT edit OR share your secret name\n" +
                "# instead, share your public name\n" +
                "# your public name: ${newId.toRef()}\n"
        val fileOutputStream: FileOutputStream
        try {
            try {
                context.deleteFile("secret")
            } catch (e: java.lang.Exception) {
                Log.d("idSTore write", "no delete?")
            }
            fileOutputStream = context.openFileOutput("secret", Context.MODE_PRIVATE)
            fileOutputStream.write(jsonSecret.encodeToByteArray())
            fileOutputStream.close()
            Log.d("idStore write", "done")
            return true
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    private fun readFromFile(): SSBid? {
        try {
            val inputStream = context.openFileInput("secret")
            val buffer = ByteArray(inputStream.available())
            inputStream.read(buffer)
            inputStream.close()
            val jsonObject = JSONObject(buffer.decodeToString())
            if (jsonObject.getString("curve") == "ed25519") {
                return SSBid(
                    Base64.decode(jsonObject.getString("private").removeSuffix(".ed25519"), Base64.NO_WRAP),
                    Base64.decode(jsonObject.getString("public").removeSuffix(".ed25519"), Base64.NO_WRAP)
                )
            }
        } catch (e: java.lang.Exception) {
            e.message?.let { Log.d("IdStore", it) }
        }
        return null
    }

    fun setNewIdentity(newSecret: ByteArray?): Boolean {
        val newId = if (newSecret == null) SSBid() else SSBid(newSecret)
        val oldId = identity
        if (writeToFile(newId)) {
            val id = readFromFile()
            if (id != null) {
                identity = id
                return true
            }
        }
        identity = oldId
        return false
    }
}
