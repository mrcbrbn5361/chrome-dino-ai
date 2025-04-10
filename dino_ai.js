// --- Zıplama Fonksiyonu ---
function zipla() {
    if (Runner.instance_.tRex.jumping || Runner.instance_.tRex.ducking) {
        return;
    }
    var event = new KeyboardEvent('keydown', {
        keyCode: 32,
        code: 'Space',
        key: ' ',
        bubbles: true
    });
    document.dispatchEvent(event);
    console.log(">>> Zıpladı!");
}

// --- Eğilme Fonksiyonları ---
function egilmeyeBasla() {
    if (Runner.instance_.tRex.ducking) {
        return;
    }
    var event = new KeyboardEvent('keydown', {
        keyCode: 40, // Aşağı ok tuşu
        code: 'ArrowDown',
        key: 'ArrowDown',
        bubbles: true
    });
    document.dispatchEvent(event);
    console.log(">>> Eğildi!");
}

function egilmeyiBirak() {
    if (!Runner.instance_.tRex.ducking) {
        return;
    }
    var event = new KeyboardEvent('keyup', {
        keyCode: 40,
        code: 'ArrowDown',
        key: 'ArrowDown',
        bubbles: true
    });
    document.dispatchEvent(event);
    console.log(">>> Eğilmeyi Bıraktı!");
}

// --- En Yakın Engeli Bulma Fonksiyonu ---
function enYakinEngeliBul() {
    var game = Runner.instance_;
    if (!game || !game.horizon || game.horizon.obstacles.length === 0) {
        return null;
    }

    var dinoOnKisimX = game.tRex.xPos + game.tRex.config.WIDTH / 2;
    var enYakinEngel = null;

    for (let i = 0; i < game.horizon.obstacles.length; i++) {
        let engel = game.horizon.obstacles[i];
        if (engel.xPos > dinoOnKisimX) {
            if (enYakinEngel === null || engel.xPos < enYakinEngel.xPos) {
                enYakinEngel = engel;
            }
        }
    }

    if (enYakinEngel) {
        return {
            mesafe: enYakinEngel.xPos - dinoOnKisimX,
            tip: enYakinEngel.typeConfig.type,
            yPos: enYakinEngel.yPos, // Pterodactyl yüksekliği için
            hiz: game.currentSpeed
        };
    }

    return null;
}

// --- Pterodactyl Yüksekliklerini Alma ---
let possibleYPos = [];
try {
    possibleYPos = Runner.config.Obstacle.types
        .filter(obstacle => obstacle.type === 'PTERODACTYL')
        .map(obstacle => obstacle.yPos)
        .sort((a, b) => a - b); // Küçükten büyüğe sırala
    if (possibleYPos.length < 3) {
        console.warn("Uyarı: Pterodactyl yükseklikleri tam tespit edilemedi, sınırlı işlevsellik.");
    }
} catch (e) {
    console.warn("Pterodactyl yükseklikleri alınamadı, varsayılan değerler kullanılacak.");
    possibleYPos = [];
}

// --- Karar Verme ve Oyun Döngüsü ---
var aiCalisiyor = false;
var sonTimestamp = 0;
var shouldDuck = false;

const TEMEL_HIZ = 6;
const REAKSIYON_MESAFESI_TEMEL = 90;
const ZIPLAMA_GECIKME_SURESI = 150;

function oyunDongusu(timestamp) {
    if (!aiCalisiyor || !Runner.instance_ || Runner.instance_.crashed) {
        aiCalisiyor = false;
        console.log("AI Durdu (Oyun Bitti veya Durduruldu).");
        return;
    }

    const deltaTime = timestamp - (sonTimestamp || timestamp);
    sonTimestamp = timestamp;

    var engelDetaylari = enYakinEngeliBul();

    if (engelDetaylari) {
        let hizCarpanı = engelDetaylari.hiz / TEMEL_HIZ;
        let mevcutReaksiyonMesafesi = REAKSIYON_MESAFESI_TEMEL * hizCarpanı * 1.1;

        console.log(`Engel: ${engelDetaylari.tip}, Mesafe: ${engelDetaylari.mesafe.toFixed(0)}px, Yükseklik: ${engelDetaylari.yPos}, Hız: ${engelDetaylari.hiz.toFixed(2)}, Reaksiyon Mesafesi: ${mevcutReaksiyonMesafesi.toFixed(0)}px`);

        // Kaktüsler için zıplama
        if (engelDetaylari.tip === 'CACTUS_SMALL' || engelDetaylari.tip === 'CACTUS_LARGE') {
            if (engelDetaylari.mesafe <= mevcutReaksiyonMesafesi && !Runner.instance_.tRex.jumping) {
                zipla();
            }
            shouldDuck = false; // Eğilme iptal edilir
        }
        // Pterodactyl'ler için yükseklik kontrolü
        else if (engelDetaylari.tip === 'PTERODACTYL' && possibleYPos.length >= 3) {
            if (engelDetaylari.yPos === possibleYPos[0]) {
                // Yüksekte uçuyor (en küçük yPos), hiçbir şey yapma
                shouldDuck = false;
            } else if (engelDetaylari.yPos === possibleYPos[1]) {
                // Ortada uçuyor, eğil
                shouldDuck = true;
            } else if (engelDetaylari.yPos === possibleYPos[2]) {
                // Alçakta uçuyor (en büyük yPos), zıpla
                if (engelDetaylari.mesafe <= mevcutReaksiyonMesafesi && !Runner.instance_.tRex.jumping) {
                    zipla();
                }
                shouldDuck = false;
            }
        } else if (engelDetaylari.tip === 'PTERODACTYL') {
            // Yükseklik bilgisi eksikse, varsayılan olarak zıpla
            if (engelDetaylari.mesafe <= mevcutReaksiyonMesafesi && !Runner.instance_.tRex.jumping) {
                zipla();
            }
            shouldDuck = false;
        }

        // Eğilme durumunu yönet
        if (shouldDuck && !Runner.instance_.tRex.ducking) {
            egilmeyeBasla();
        } else if (!shouldDuck && Runner.instance_.tRex.ducking) {
            egilmeyiBirak();
        }
    } else {
        // Engel yoksa eğilmeyi bırak
        if (Runner.instance_.tRex.ducking) {
            egilmeyiBirak();
        }
        shouldDuck = false;
    }

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
    sonTimestamp = 0;
    console.log("AI Başlatılıyor...");
    requestAnimationFrame(oyunDongusu);
}

function aiDurdur() {
    aiCalisiyor = false;
    console.log("AI Durduruluyor...");
}

// --- Kullanım ---
console.log("AI Hazır. Başlatmak için 'aiBaslat()' yazın, durdurmak için 'aiDurdur()' yazın.");
