package nz.scuttlebutt.tremola

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import com.google.zxing.integration.android.IntentIntegrator
import nz.scuttlebutt.tremola.ssb.Game
import nz.scuttlebutt.tremola.ssb.TremolaState
import nz.scuttlebutt.tremola.ssb.db.entities.LogEntry
import nz.scuttlebutt.tremola.ssb.db.entities.Pub
import nz.scuttlebutt.tremola.ssb.peering.RpcInitiator
import nz.scuttlebutt.tremola.ssb.peering.RpcServices
import nz.scuttlebutt.tremola.utils.HelperFunctions.Companion.id2
import nz.scuttlebutt.tremola.utils.getBroadcastAddress
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.Executors


// pt 3 in https://betterprogramming.pub/5-android-webview-secrets-you-probably-didnt-know-b23f8a8b5a0c

class WebAppInterface(private val act: Activity, val tremolaState: TremolaState, private val webView: WebView) {
    private val me = addBackslash(tremolaState.idStore.identity.toRef())

    private fun addBackslash(s: String): String {
        val arr = s.split("/")
        var sol = ""
        for (el in arr){
            sol += "$el\\/"
        }
        return sol.removeSuffix("\\/")
    }

    private var to = mutableListOf<String>()
    private var from = mutableListOf<String>()
    /**
     * Receives commands from the GUI.
     * Note that there is no counterpart to this method in webView, {@see WebAppInterface::eval}
     */
    @JavascriptInterface
    fun onFrontendRequest(s: String) {
        //handle the data captured from webview}
        Log.d("FrontendRequest", s)
        val args = s.split(" ")
        when (args[0]) {
            "removeGame" -> {
                if((act as MainActivity).game != null)
                    act.game = null
            }
            "startGame" -> {
                eval("wait_on_Game()")
                val rawStr = tremolaState.msgTypes.mkGamePost(
                    "/ed25519-start: "+args[1]+" "+args[2],
                    listOf(args[2])
                )
                val evnt = tremolaState.msgTypes.jsonToLogEntry(
                    rawStr,
                    rawStr.encodeToByteArray()
                )
                evnt?.let { rx_event(it) } // persist it, propagate horizontally and also up

                if (evnt != null) {
                    val ps = evnt.pri.toString().split(" ")
                    val strng = ps[2].split("\"")[0]
                    if(!to.contains(strng)) {
                        to.add(strng)
                        checkConnectionOrder("to", strng)
                    }
                }
            }

            "gameProtocol" -> {
                // args[1] : string with method name
                // args[2] : string with method parameters (comma separated)
                act as MainActivity
                val addr = act.game?.peer_addr().toString()
                val str = "/ged25519-prot: "+args[1]+" "+args[2]+" "+addr
                val rawStr = tremolaState.msgTypes.mkGamePost(
                    str,
                    listOf(addr)
                )
                val evnt = tremolaState.msgTypes.jsonToLogEntry(
                    rawStr,
                    rawStr.encodeToByteArray()
                )

                evnt?.let { rx_event(it) } // persist it, propagate horizontally and also up
            }

            "onBackPressed" -> { // When 'back' is pressed, will close app
                (act as MainActivity)._onBackPressed()
            }
            "game: ui" -> {
                eval("set_game_counter(\"${args[1]}\")")
            }
            "ready" -> { // Initialisation, send localID to frontend
                eval("b2f_initialize(\"${tremolaState.idStore.identity.toRef()}\")")
            }
            "reset" -> { // UI reset
                // erase DB content
                eval("b2f_initialize(\"${tremolaState.idStore.identity.toRef()}\")")
            }
            "restream" -> { // Resend all the log of private messages
                for (logEntry in tremolaState.logDAO.getAllAsList())
                    if (logEntry.pri != null) // only private chat msgs
                        sendEventToFrontend(logEntry)
            }
            "qrscan.init" -> { // start scanning the qr code (open the camera)
                val intentIntegrator = IntentIntegrator(act)
                intentIntegrator.setBeepEnabled(false)
                intentIntegrator.setCameraId(0)
                intentIntegrator.setPrompt("SCAN")
                intentIntegrator.setBarcodeImageEnabled(false)
                intentIntegrator.initiateScan()
                return
            }
            "secret:" -> { // import a new ID (is not used)
                if (importIdentity(args[1])) {
                    tremolaState.logDAO.wipe()
                    tremolaState.contactDAO.wipe()
                    tremolaState.pubDAO.wipe()
                    act.finishAffinity()
                }
                return
            }
            "exportSecret" -> { // Show the secret key (both as string and qr code)
                val json = tremolaState.idStore.identity.toExportString()!!
                eval("b2f_showSecret('${json}');")
                val clipboard = tremolaState.context.getSystemService(ClipboardManager::class.java)
                val clip = ClipData.newPlainText("simple text", json)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(
                    act, "secret key was also\ncopied to clipboard",
                    Toast.LENGTH_LONG
                ).show()
            }
            "sync" -> { // add a peer to a pub (never used)
                addPub(args[1])
                return
            }
            "wipe" -> { // Delete all data about the peer, included ID (not revertible)
                tremolaState.logDAO.wipe()
                tremolaState.contactDAO.wipe()
                tremolaState.pubDAO.wipe()
                tremolaState.idStore.setNewIdentity(null) // creates new identity
                // eval("b2f_initialize(\"${tremolaState.idStore.identity.toRef()}\")")
                // FIXME: should kill all active connections, or better then the app
                act.finishAffinity()
            }
            "add:contact" -> { // Add a new contact
                // Only store in database and advertise it to connected peers via SSB event.
                // The peering with the new contact is automatically done by /ssb/peering/PeeringPool::add,
                // Which is called in /ssb/TremolaState::init by a fixed rate scheduled procedure.
                // ID and alias
                tremolaState.addContact(
                    args[1],
                    Base64.decode(args[2], Base64.NO_WRAP).decodeToString()
                )
                val rawStr = tremolaState.msgTypes.mkFollow(args[1])
                val evnt = tremolaState.msgTypes.jsonToLogEntry(
                    rawStr,
                    rawStr.encodeToByteArray()
                )
                evnt?.let {
                    rx_event(it) // persist it, propagate horizontally and also up
                    tremolaState.peers.newContact(args[1]) // inform online peers via EBT
                }
                return
            }
            "priv:post" -> { // Post a private chat
                // atob(text) recipient1 recipient2 ...
                val rawStr = tremolaState.msgTypes.mkPost(
                    Base64.decode(args[1], Base64.NO_WRAP).decodeToString(),
                    args.slice(2..args.lastIndex)
                )
                val evnt = tremolaState.msgTypes.jsonToLogEntry(
                    rawStr,
                    rawStr.encodeToByteArray()
                )
                evnt?.let { rx_event(it) } // persist it, propagate horizontally and also up
                return
            }
            "priv:hash" -> { // Compute the shortname from the public key
                // The second arg is the name of the method to call with the result of the hash
                val shortname = id2(args[1])
                Log.e("SHORT", shortname + ": " + args[1] + " and " + args[2])
                eval("${args[2]}('" + shortname + "', '" + args[1] + "')")
            }
            "invite:redeem" -> { // Join a pub with invite code
                try {
                    val invitation = args[1].split("~") //[pub_mark, invite_code]
                    val id = invitation[0].split(":") // [IP_address, port, pub_SSB_ID]
                    val remoteKey = Base64.decode(id[2].slice(1..-8), Base64.NO_WRAP)
                    val seed = Base64.decode(invitation[1], Base64.NO_WRAP) // invite_code
                    val rpcStream = RpcInitiator(tremolaState, remoteKey)
                    val ex = Executors.newSingleThreadExecutor() // one thread per peer
                    ex?.execute {
                        rpcStream.defineServices(RpcServices(tremolaState))
                        rpcStream.startPeering(id[0], id[1].toInt(), seed)
                    }
                    Toast.makeText(
                        act, "Pub is being contacted ..",
                        Toast.LENGTH_SHORT
                    ).show()
                } catch (e: Exception) {
                    Toast.makeText(
                        act, "Problem parsing invite code",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
            "look_up" -> { // Start a lookup
                val shortname = args[1]
                try {
                    getBroadcastAddress(act).hostAddress
                    val lookup = (act as MainActivity).lookup
                    val send = lookup!!.prepareQuery(shortname)
                    if (send != null)
                        lookup.sendQuery(send)
                    else
                        Log.d("LOOKUP", "$shortname is already in contacts")
                } catch (e: IOException) {
                    Log.e("BROADCAST", "Failed to obtain broadcast address")
                } catch (e: Exception) {
                    Log.e("BROADCAST", e.stackTraceToString())
                }
            }
            else -> {
                Log.d("onFrontendRequest", "unknown")
            }
        }
        /*
        if (s == "btn:chats") {
            select(listOf("chats","contacts","profile"))
        }
        if (s == "btn:contacts") {
            select(listOf("contacts","chats","profile"))
        }
        if (s == "btn:profile") {
            select(listOf("profile","contacts","chats"))
        }
        */
    }

    /**
     * Indirectly but automatically calls any method in the frontend.
     * Note that the args must be inside single quotes (') :
     * eval("b2f_local_peer('" + arg + "', 'someText')")
     * OR
     * eval("b2f_local_peer('${arg}', 'someText')")
     */
    fun eval(js: String) { // send JS string to webkit frontend for execution
        webView.post(Runnable {
            webView.evaluateJavascript(js, null)
        })
    }

    /**
     * Only called (but commented out) from tremola.js::menu_import_id,
     * which is never called (Menu item leading to it is commented out)
     */
    private fun importIdentity(secret: String): Boolean {
        Log.d("D/importIdentity", secret)
        if (tremolaState.idStore.setNewIdentity(Base64.decode(secret, Base64.DEFAULT))) {
            // FIXME: remove all decrypted content in the database, try to decode new one
            Toast.makeText(
                act, "Imported of ID worked. You must restart the app.",
                Toast.LENGTH_SHORT
            ).show()
            return true
        }
        Toast.makeText(act, "Import of new ID failed.", Toast.LENGTH_LONG).show()
        return false
    }

    private fun addPub(pubstring: String) {
        Log.d("D/addPub", pubstring)
        val components = pubstring.split(":")
        tremolaState.addPub(
            Pub(
                lid = "@" + components[3] + ".ed25519",
                host = components[1],
                port = components[2].split('~')[0].toInt()
            )
        )
    }

    fun rx_event(entry: LogEntry) {
        // when we come here we assume that the event is legit (chaining and signature)
        tremolaState.addLogEntry(entry)       // persist the log entry
        sendEventToFrontend(entry)            // notify the local app
        tremolaState.peers.newLogEntry(entry) // stream it to peers we are currently connected to
        if(entry.pri?.startsWith("{\"type\":\"game\"") == true)
            checkGameEntries(entry)
    }

    private fun checkGameEntries(entry: LogEntry) {
        if(entry.pri?.removePrefix("{\"type\":\"game\",\"text\":\"\\")?.startsWith("/ged25519-prot: ") == true){
            val args = entry.pri?.split(" ")
            val addr = args?.get(3)?.split("\"")?.get(0)?.let { removeRedundantBackslashes(it) } //addr : receiver
            if(addr == (act as MainActivity).game?.own_addr()) {
                if(args?.get(2)  == ",")
                    eval(args[1] +"()")
                else {
                    val str = (args?.get(1)) +"("+ (args?.get(2)) +")"
                    eval(str)
                }
            }
        }
        if(entry.pri?.removePrefix("{\"type\":\"game\",\"text\":\"\\")?.startsWith("/ed25519-start: ")  == true){
            val args = entry.pri?.split(" ") // args[1] : sender
            val strng = args?.get(2)?.split("\"")?.get(0) // strng : receiver
            if(strng == me && !from.contains(args[1])) {
                args[1].let { from.add(it) }
                checkConnectionOrder("from", args[1])
            }
        }
    }

    private fun removeRedundantBackslashes(strng: String): String {
        var args = strng.split("/")
        var l = args.size - 1
        var sol = ""
        for(i in 0..l) {
            sol += args[i].trimEnd('\\') + "\\/"
        }
        return sol.removeSuffix("\\/")
    }

    fun sendEventToFrontend(evnt: LogEntry) {
        // Log.d("MSG added", evnt.ref.toString())
        var hdr = JSONObject()
        hdr.put("ref", evnt.hid)
        hdr.put("fid", evnt.lid)
        hdr.put("seq", evnt.lsq)
        hdr.put("pre", evnt.pre)
        hdr.put("tst", evnt.tst)
        var cmd = "b2f_new_event({header:${hdr.toString()},"
        cmd += "public:" + (if (evnt.pub == null) "null" else evnt.pub) + ","
        cmd += "confid:" + (if (evnt.pri == null) "null" else evnt.pri)
        cmd += "});"
        Log.d("CMD", cmd)
        eval(cmd)
    }

    private fun checkConnectionOrder(order : String?, addr : String?) {
        act as MainActivity
        if(order == "to" && from.contains(addr)){
            if(act.game == null)
                act.game = Game(me,addr)
            act.game!!.first(false)
        }else if(order == "from" && to.contains(addr)){
            if(act.game == null)
                act.game = Game(me,addr)
            act.game!!.first(true)
        }else return
        to = mutableListOf()
        from = mutableListOf()
        if(act.game!!.is_first())
            eval("game_window(true)")
        else
            eval("game_window(false)")
    }
}