package nz.scuttlebutt.tremola.ssb

class Game (private val me : String?, private val peer : String?){
    private var ct = 0
    private var turn = false
    private var nd = false
    private var mee = me
    private var you = peer
    fun switch_turns(){
        turn = !turn
    }
    fun first(b : Boolean){
        if(ct == 0) {
            nd = b
            turn = b
        }
        ct++
    }
    fun is_first() : Boolean{
        return nd
    }
    fun is_turn() : Boolean{
        return turn
    }
    fun own_addr() : String?{
        return mee
    }
    fun peer_addr() : String?{
        return you
    }
}