// --- Zıplama Fonksiyonu ---
function zipla() {
    // Zaten zıplıyorsa veya eğiliyorsa tekrar zıplama komutu gönderme
    if (Runner.instance_.tRex.jumping || Runner.instance_.tRex.ducking) {
        return;
    }
    // Space tuşuna basılma olayını simüle et
    var event = new KeyboardEvent('keydown', {
        keyCode: 32, // Space tuşunun kodu
        code: 'Space',
        key: ' ',
        bubbles: true
    });
    document.dispatchEvent(event);
    console.log(">>> Zıpladı!");
}

// --- En Yakın Engeli Bulma Fonksiyonu ---
function enYakinEngeliBul() {
    var game = Runner.instance_;
    if (!game || !game.horizon || game.horizon.obstacles.length === 0) {
        return null; // Oyun çalışmıyor veya engel yok
    }

    // Dino'nun önündeki (x koordinatı Dino'dan büyük olan) ilk engeli bul
    var dinoOnKisimX = game.tRex.xPos + game.tRex.config.WIDTH / 2; // Dino'nun yaklaşık önü
    var enYakinEngel = null;

    for (let i = 0; i < game.horizon.obstacles.length; i++) {
        let engel = game.horizon.obstacles[i];
        // Engelin x koordinatı Dino'nun önündeyse ve henüz bir en yakın engel bulmadıysak
        if (engel.xPos > dinoOnKisimX) {
             // Veya engel Dino ile kesişiyorsa (çoktan çarpmış olabilir ama yine de önemli)
             // Veya engel Dino'nun hemen önündeyse
            if (enYakinEngel === null || engel.xPos < enYakinEngel.xPos) {
                 enYakinEngel = engel;
            }
        }
    }

    // Eğer bir engel bulunduysa, detaylarını döndür
    if (enYakinEngel) {
        return {
            mesafe: enYakinEngel.xPos - dinoOnKisimX, // Engel ile Dino arasındaki mesafe
            tip: enYakinEngel.typeConfig.type,      // 'CACTUS_SMALL', 'CACTUS_LARGE', 'PTERODACTYL'
            hiz: game.currentSpeed                  // Mevcut oyun hızı
            // Uçan dinozorun yüksekliği (yPos) burada zıplama kararı için şimdilik kullanılmıyor.
        };
    }

    return null; // Önde engel yoksa null döndür
}

// --- Karar Verme ve Oyun Döngüsü ---
var aiCalisiyor = false;
var sonTimestamp = 0;

// EŞİKLERİ AYARLAMAK ÇOK ÖNEMLİDİR!
const TEMEL_HIZ = 6; // Oyunun başlangıç hızı (yaklaşık)
const REAKSIYON_MESAFESI_TEMEL = 90; // Temel hızda reaksiyon verilecek piksel mesafesi (DENEYEREK AYARLAYIN!)
const ZIPLAMA_GECIKME_SURESI = 150; // Zıplamanın tamamlanması için gereken tahmini süre (ms) - Opsiyonel

function oyunDongusu(timestamp) {
    if (!aiCalisiyor || !Runner.instance_ || Runner.instance_.crashed) {
        aiCalisiyor = false;
        console.log("AI Durdu (Oyun Bitti veya Durduruldu).");
        return;
    }

    // Zaman farkı (delta time) - Şu anki kullanım basit, daha gelişmiş TTI için lazım olabilir
    const deltaTime = timestamp - (sonTimestamp || timestamp);
    sonTimestamp = timestamp;

    var engelDetaylari = enYakinEngeliBul();

    if (engelDetaylari) {
        // Hıza göre dinamik reaksiyon mesafesi hesapla
        let hizCarpanı = engelDetaylari.hiz / TEMEL_HIZ;
        let mevcutReaksiyonMesafesi = REAKSIYON_MESAFESI_TEMEL * hizCarpanı;

        // Güvenlik payı ekle (isteğe bağlı, daha erken zıplamak için)
        mevcutReaksiyonMesafesi *= 1.1; // %10 daha erken gibi

        console.log(`Engel: ${engelDetaylari.tip}, Mesafe: ${engelDetaylari.mesafe.toFixed(0)}px, Hız: ${engelDetaylari.hiz.toFixed(2)}, Reaksiyon Mesafesi: ${mevcutReaksiyonMesafesi.toFixed(0)}px`);

        // Karar: Engel yeterince yakınsa VE Dino yerde ise (zıplamıyorsa) zıpla
        if (engelDetaylari.mesafe <= mevcutReaksiyonMesafesi && !Runner.instance_.tRex.jumping) {
             // Dino'nun yerde olup olmadığını daha kesin kontrol etmek için:
             // if (engelDetaylari.mesafe <= mevcutReaksiyonMesafesi && Runner.instance_.tRex.yPos <= Runner.instance_.tRex.config.GROUND_POS) {
            zipla();
             // }
        }
    } else {
        // console.log("Engel yok.");
    }

    // Döngüyü devam ettir
    requestAnimationFrame(oyunDongusu);
}

// --- AI Başlatma ve Durdurma Fonksiyonları ---
function aiBaslat() {
    if (aiCalisiyor) return;
    if (!Runner.instance_ || Runner.instance_.crashed) {
         console.log("Önce oyunu başlatın!");
         return;
    }
    aiCalisiyor = true;
    sonTimestamp = 0; // Zamanlayıcıyı sıfırla
    console.log("AI Başlatılıyor...");
    requestAnimationFrame(oyunDongusu); // Döngüyü başlat
}

function aiDurdur() {
    aiCalisiyor = false;
    console.log("AI Durduruluyor...");
}

// --- Kullanım ---
console.log("AI Hazır. Başlatmak için 'aiBaslat()' yazın, durdurmak için 'aiDurdur()' yazın.");