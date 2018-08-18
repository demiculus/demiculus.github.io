//

var unsuz1 = "krz";
var unlu = "aeıioöuüäíú";
var kararliUnlu = "aeıioöuü";
var kalinUnlu = "aıou";
var inceUnlu = "eiöü";

// var unlu = ["a","e","ı","i","o","ö","u","ü"];
// var kalinUnlu = ["a", "ı", "o", "u"];
// var inceUnlu = ["e", "i", "ö", "ü"];
// var duzUnlu = ["a","e","ı","i"];
// var yuvarlakUnlu = ["o","ö","u","ü"];

// var darUnlu = ["ı","i","u","ü"];
// var genisUnlu = ["a","e","o","ö"];

var unsuz = "bcçdfgğhjklmnprsştvyzqxw";


function setCharAt(str,index,chr) {
    if(index > str.length-1) return str;
    return str.substr(0,index) + chr + str.substr(index+1);
}

// function cevrelenmemisRegex(a, b) {
//     return new RegExp('^['+b+']*'+a+'^['+b+']*', 'i');
//     // return new RegExp(a, 'i');
// }

function cevrelenmemisAndReplace(str,match,hedef,cevre) {
    return str.replace(new RegExp("(["+cevre+"])?"+match+"(?!["+cevre+"])","i"), function($0, $1) {
        return $1 ? $0 : hedef;
    });
}

function cevrelenmemisOrReplace(str,match,hedef,cevre) {
    var result = str.replace(new RegExp("(["+cevre+"])?"+match), function($0,$1){ return $1?$0:hedef;});
    // negative lookbehind adam gibi calismiyor duzeltmek lazim
    result = result.replace(new RegExp("ğ(?!["+unlu+"])","i"),"g");
    return result;
}

function cevrelenmisReplace(str,match,hedef,cevre) {
    return str.replace(new RegExp(match+"(?=["+cevre+"])","i"), function ($0, idx, str) {
        if (idx>0 && new RegExp("["+cevre+"]","i").test(str[idx - 1])) { // Equivalent to (?<!a)
            return hedef;
        } else {
            return $0; // $0 is the text matched by /b(?!a)/
        }
    });
}

function Turkifier(fonetik, imla, sapka, kelimeBasiSonu, sonIkiUnsuz) {
    this.fonetik = fonetik;
    this.imla = imla;
    this.sapka = sapka;
    this.kelimeBasiSonu = kelimeBasiSonu;
    this.sonIkiUnsuz = sonIkiUnsuz;

    this.ciftUnsuzIleBitiyor = function() {
        bool = (unsuz.indexOf(this.k[this.k.length-1]) > -1)
            && (unsuz.indexOf(this.k[this.k.length-2]) > -1);
        if (bool) {
            return this.k.substr(this.k.length-2);
        }
        return bool;
        // return (unsuz.indexOf(k[k.length-1]) > -1)
        //     && (unsuz.indexOf(k[k.length-2]) > -1);
    }

    this.pozisiondanOncekiIlkUnlu = function(p) {
        for(var i = p; i >= 0; i--) {
            if (unlu.indexOf(this.k[i])>-1) {
                return this.k[i];
            }
        }
        return false;
    }

    this.sonIkiUnsuzunArasiniDoldur = function() {
        // son iki unsuzun arasini doldur

        var sonCiftUnsuz = this.ciftUnsuzIleBitiyor();
        if (sonCiftUnsuz) {
            if (sonCiftUnsuz[0]==sonCiftUnsuz[1]) {
                this.k = this.k.substring(0, this.k.length - 1);
            } else if("rlzsş".indexOf(sonCiftUnsuz[0]) === -1 || "m".indexOf(sonCiftUnsuz[1]) > -1){
                var dum = this.pozisiondanOncekiIlkUnlu(this.k.length);
                // window.alert(dum);
                if (dum) {
                    if (inceUnlu.indexOf(dum)>-1) {
                        dum = "i";
                    } else {
                        dum = "ı";
                    }
                    this.pozisionaStrKoy(this.k.length-1,dum);
                }

            }
        }
    }

    this.pozisionaStrKoy = function(p, str) {
        this.k =  this.k.slice(0,p) + str + this.k.slice(p,this.k.length);
    }


    this.unsuzEtrafindakiUnluleriKararlilastir = function(unsuz, kalin) {
        var kararsizUnluler = ["ä","í","ú"];
        if (kalin) {
            var kararliUnlulerList = ["a","ı","u"];
        } else {
            var kararliUnlulerList = ["e","i","ü"];
        }

        for(var i = 0; i < kararsizUnluler.length; i++) {
            this.k = this.k.replace(new RegExp(kararsizUnluler[i]+unsuz), kararliUnlulerList[i]+unsuz);
            this.k = this.k.replace(new RegExp(unsuz+kararsizUnluler[i]), unsuz+kararliUnlulerList[i]);
        }
    };

    this.nihaiKararlilastirma = function() {
        var kararsizUnluler = "äíú";
        var kararliDict = {"ä":["a","e"],"í":["ı","i"],"ú":["u","ü"]};
        for(var i = 0; i < this.k.length; i++) {
            if (kararsizUnluler.indexOf(this.k[i]) > -1) {
                var enYakinKararliUnlu = this.enYakinKararliUnluyuBul(i);
                if (!enYakinKararliUnlu) {
                    if (this.enYakinKalinUnsuzuBul(i, 4)) {
                        enYakinKararliUnlu = "a";
                    } else {
                        enYakinKararliUnlu = "e";
                    }
                }
                if (this.kalinmiIncemi(enYakinKararliUnlu)) {
                    this.k = setCharAt(this.k, i, kararliDict[this.k[i]][0]);
                } else {
                    this.k = setCharAt(this.k, i, kararliDict[this.k[i]][1]);
                }
            }
        }
    };


    this.enYakinHarfiBul = function(idx, liststring, mesafe) {
        var distBack = 0, distForward = 0;
        // var unluBack = undefined, unluForward = undefined;

        var i = idx, j = idx;
        var count = 0;
        while (((i>=0)||(j<this.k.length))&&(count<=mesafe)) {
            i--; j++; count++;
            if (liststring.indexOf(this.k[i]) > -1) {
                return this.k[i];
            }
            if (liststring.indexOf(this.k[j]) > -1) {
                return this.k[j];
            }
        }
        return false;
    }

    this.enYakinKararliUnluyuBul = function(idx) {
        return this.enYakinHarfiBul(idx, kararliUnlu, 999);
    }

    this.enYakinKalinUnsuzuBul = function(idx, mesafe) {
        return this.enYakinHarfiBul(idx, ["ḱ","x","ź","ś","t́","h́"], mesafe);
    }

    this.kalinmiIncemi = function(u) {
        if (kalinUnlu.indexOf(u)>-1) {
            return true;
        } else {
            return false;
        }
    }

    this.imlayiBasitlestir = function() {
        this.k = this.k.replace(/ḱ/g,"k");
        this.k = this.k.replace(/x/g,"h");
        this.k = this.k.replace(/ź/g,"z");
        this.k = this.k.replace(/ś/g,"s");
        this.k = this.k.replace(/t́/g,"t");
        this.k = this.k.replace(/h́/g,"h");
        this.k = this.k.replace(/ɖ/g,"z");
        this.k = this.k.replace(/ⱬ/g,"z");
        this.k = this.k.replace(/þ/g,"s");
    };

    this.sapkaKoy = function() {
        this.k = this.k.replace(/aa/g,"â");
        this.k = this.k.replace(/ee/g,"ê");
        this.k = this.k.replace(/uu/g,"û");
        this.k = this.k.replace(/üü/g,"û");
        this.k = this.k.replace(/ıı/g,"î");
        this.k = this.k.replace(/ii/g,"î");
        // this.k = this.k.replace(/aa+/g,"â");
        // this.k = this.k.replace(/ee+/g,"ê");
        // this.k = this.k.replace(/uu+/g,"û");
        // this.k = this.k.replace(/üü+/g,"û");
        // this.k = this.k.replace(/ıı+/g,"î");
        // this.k = this.k.replace(/ii+/g,"î");
    };

    this.unsuzKararlilastirmasi = function() {

        this.unsuzEtrafindakiUnluleriKararlilastir("ḱ", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("x", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("h́", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("ş", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("s", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("ś", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("h", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("ź", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("z", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("k", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("t", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("t́", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("c", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("d", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("ɖ", true);
        this.unsuzEtrafindakiUnluleriKararlilastir("r", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("b", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("m", false);
        // this.unsuzEtrafindakiUnluleriKararlilastir("n", false);
        this.unsuzEtrafindakiUnluleriKararlilastir("ğ", true);

    };


    this.fonetigiTurkcelestir = function() {
        // this.k = this.k.replace(/äa/g,"aa");
        // this.k = this.k.replace(/aä/g,"aa");

        this.k = this.k.replace(/ø/g,"a");
        // this.k = this.k.replace(/ø/g,"ä");


        this.k = this.k.replace(/^ai/g,"i");
        this.k = this.k.replace(/^iä/g,"ii");

        this.k = this.k.replace(/äví/g,"äí");
        // this.k = this.k.replace(/ívä/g,"íä");
        // this.k = this.k.replace(/ívä/g,"iä");
        // this.k = this.k.replace(/ävä/g,"äíä");
        this.k = this.k.replace(/ävä/g,"äiä");

        // this.k = this.k.replace(/ívm/g,"íym");
        // this.k = this.k.replace(/ív/g,"íy");
        // this.k = this.k.replace(new RegExp("ív(?=["+unlu+"])"),"íy");
        this.k = this.k.replace(new RegExp("ív(?=["+unsuz+"])"),"íy");
        // this.k = this.k.replace(new RegExp("ív(?=["+unsuz+"])"),"iy");

        this.k = this.k.replace(/^aí/g,"ı");
        this.k = this.k.replace(/^aú/g,"u");
        this.k = this.k.replace(/^äí/g,"i");
        this.k = this.k.replace(/^äú/g,"ü");

        this.k = this.k.replace(/íí/g,"ii");

        this.k = this.k.replace(/úú/g,"uu");


        // this.k = this.k.replace(/xä/g,"xa");
        // this.k = this.k.replace(/xú/g,"xu");
        // this.k = this.k.replace(/xí/g,"xı");
        // this.k = this.k.replace(/hä/g,"he");
        // this.k = this.k.replace(/hú/g,"hü");
        // this.k = this.k.replace(/hí/g,"hi");

        this.k = this.k.replace(/dí/g,"di");

        this.k = this.k.replace(/ḱííḱ/g,"ḱiiḱ");
        this.k = this.k.replace(/bíb/g,"bib");


        this.k = this.k.replace(/äb$/g,"ab");

        //
        this.unsuzKararlilastirmasi();


        // this.k = this.k.replace(/dä$/g,"de");
        this.k = this.k.replace(/^dä/g,"da");

        this.k = this.k.replace(/ím/g,"im");
        this.k = this.k.replace(/mäf/g,"mef");

        // this.k sonu
        this.k = this.k.replace(/lä$/g,"le");
        this.k = this.k.replace(/lät$/g,"let");
        this.k = this.k.replace(/ämä$/g,"ame");
        this.k = this.k.replace(/mä$/g,"me");
        this.k = this.k.replace(/äm$/g,"am");
        this.k = this.k.replace(/úm$/g,"üm");
        this.k = this.k.replace(/mät$/g,"met");
        this.k = this.k.replace(/där$/g,"dar");
        this.k = this.k.replace(/är$/g,"ar");
        this.k = this.k.replace(/dät$/g,"dat");
        // this.k = this.k.replace(/äl$/g,"al");

        this.k = this.k.replace(/fä$/g,"fe");
        this.k = this.k.replace(/äf$/g,"af");
        // this.k = this.k.replace(/íf$/g,"ıf");

        this.k = this.k.replace(/ví/g,"vi");

        // this.k = this.k.replace(/äl/g,"al");

        this.k = this.k.replace(new RegExp("^dä(?!["+unlu+"])"),"de");
        // this.k = this.k.replace(new RegExp("^sä(?!["+unlu+"])"),"se");
        // this.k = this.k.replace(new RegExp("^şä(?!["+unlu+"])"),"şe");
        this.k = this.k.replace(new RegExp("^lä"),"le");
        this.k = this.k.replace(new RegExp("äz(?![íi])"),"az");



        this.k = this.k.replace(/ír/g,"ir");
        this.k = this.k.replace(/íl/g,"il");
        this.k = this.k.replace(/úl/g,"ül");
        this.k = this.k.replace(/lú/g,"lü");
        this.k = this.k.replace(/lí/g,"li");

        // this.k = this.k.replace(/aä/g,"aa");

        // this.k = this.k.replace(/äa/g,"aa");
        // this.k = this.k.replace(/eä/g,"ee");
        // this.k = this.k.replace(/äe/g,"ee");
        // this.k = this.k.replace(/ee/g,"e");
        this.k = this.k.replace(/aaä/g,"aaa");

        // this.k = this.k.replace(/ía/g,"ii");
        // this.k = this.k.replace(cevrelenmemisRegex("ía", unlu),"ii");
        this.k = cevrelenmemisAndReplace(this.k,"ía","ii",unlu);


        this.k = this.k.replace(/ae/g,"aa");
        this.k = this.k.replace(/ea/g,"aa");
        this.k = this.k.replace(/^ia/g,"ii");

        this.nihaiKararlilastirma();

        this.k = cevrelenmisReplace(this.k,"v","i",unlu);
        this.k = cevrelenmisReplace(this.k,"vv","yy",unlu);
        this.k = cevrelenmisReplace(this.k,"ii","yy",unlu);
        this.k = cevrelenmisReplace(this.k,"i","y",unlu);

        // this.k = this.k.replace(/uü/g,"uu");


    };

    this.kelimeBasiSonuModifikasionu = function() {
        this.k = this.k.replace(/b$/g,"p");
        this.k = this.k.replace(/d$/g,"t");
        this.k = this.k.replace(/c$/g,"ç");
        this.k = this.k.replace(/g$/g,"k");

        // // basta ğ olmaz
        this.k = this.k.replace(/^ğ/g,"g");
        this.k = cevrelenmemisOrReplace(this.k,"ğ","g",unlu);
        this.k = this.k.replace(/gğ/g,"gg");

    };

    this.turkify = function(kelime) {
        this.k = new String(kelime);
        if (this.fonetik) this.fonetigiTurkcelestir();
        if (this.imla) this.imlayiBasitlestir();
        if (this.sapka) this.sapkaKoy();
        if (this.sonIkiUnsuz) this.sonIkiUnsuzunArasiniDoldur();
        if (this.kelimeBasiSonu) this.kelimeBasiSonuModifikasionu();

        this.k = this.k.replace(/aa+/g,"aa");
        // this.k = this.k.replace(/aaaa/g,"aa");
        // this.k = this.k.replace(/aaaaa/g,"aa");


        return this.k;
    };

}
