# Gozel Esnaf — Yerel Masaüstü Ön Muhasebe Sistemi

**Gozel Esnaf**, küçük ve orta ölçekli işletmelerin günlük ticari işlemlerini (müşteriler, ürünler, stoklar, satışlar, giderler, tahsilatlar ve finansal raporlar) kolayca, güvenle ve internet bağımlılığı olmaksızın takip edebilmesi için geliştirilmiş yerel masaüstü ön muhasebe uygulamasıdır.

**Geliştirici:** Gozel Software  
**Sürüm:** v0.1.0  
**Lisans:** MIT  

---

## 🎯 Projenin Amacı ve Kapsamı

Gozel Esnaf, esnafın ve küçük işletmelerin karmaşık bulut aboneliklerine veya harici servis bağlantılarına ihtiyaç duymadan kendi bilgisayarlarında verilerini tam kontrol altında tutmalarını sağlar.

> [!NOTE]
> **Yasal Uyarı / Kapsam:** Bu uygulama bir **ön muhasebe ve ticari takip** programıdır. İlk sürümünde e-Fatura, e-Arşiv, GİB entegrasyonu veya banka API bağlantısı içermez. Resmî vergi ve mali müşavirlik yükümlülüklerinin yerine geçmez.

---

## 🚀 Öne Çıkan Özellikler

- **Müşteri Yönetimi & Cari Takip:** Müşteri kayıtları, borç/alacak bakiyeleri ve detaylı cari hareket dökümü.
- **Ürün & Stok Yönetimi:** Ürün kataloğu, kritik stok seviye uyarıları ve otomatik stok düşüşü/iadesi.
- **Hızlı Satış Sistemi:** Tek ekranda müşteri seçimi, ürün ekleme, parça/tam tahsilat, veresiye satışı ve fiş yazdırma.
- **Gider & Tahsilat Yönetimi:** Kategori bazlı işletme giderleri ve tahsilat makbuzu kayıtları.
- **Canlı Dashboard & Trend Grafiği:** Günlük satış hareketleri, kritik stok uyarıları, bu ayın finansal özeti ve 7 günlük satış trend grafiği.
- **Veri Güvenliği & Yedekleme:** SQLite WAL günlük modu, tek tıkla online veritabanı yedeği alma, integrity check doğrulamalı güvenli geri yükleme.
- **CSV Dışa Aktarma:** Müşteri, ürün, satış, gider ve tahsilat verilerini UTF-8 BOM Excel uyumlu CSV olarak dışa aktarma (Formül korumalı).

---

## 🛠️ Teknoloji Yığını

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend:** Python 3.10+ (Python 3.14 destekli), FastAPI, Uvicorn, SQLAlchemy
- **Veritabanı:** SQLite 3 (WAL - Write-Ahead Logging günlük modu ve Foreign Key korumalı)
- **Frontend Adresi:** `http://localhost:3000`
- **Backend Adresi:** `http://127.0.0.1:8000` (Yalnızca yerel loopback dinleme)
- **İşletim Sistemi:** Windows (Öncelikli)

---

## 💻 Windows Kurulumu ve Gereksinimler

### Gereken Yazılımlar
1. **Python:** Python 3.10 veya üzeri ([python.org](https://www.python.org)) — *Kurulumda "Add Python to PATH" seçeneğini işaretleyin.*
2. **Node.js:** Node.js LTS sürümü ([nodejs.org](https://nodejs.org))

> [!IMPORTANT]
> **İnternet Bağlantısı:** İlk kurulum sırasında Python sanal ortamının (`backend/venv`) ve frontend paketlerinin (`frontend/node_modules`) indirilmesi için internet bağlantısı gerekir. Kurulum tamamlandıktan sonra uygulama **tamamen çevrimdışı (offline)** çalışır.

---

## ⚡ Başlatma ve Durdurma Betikleri (`start.bat` & `stop.bat`)

### Uygulamayı Başlatma (`start.bat`)
Proje ana dizinindeki `start.bat` dosyasına çift tıklayın:
1. Python ve Node.js ortamlarının kurulu olup olmadığını denetler.
2. `3000` (frontend) ve `8000` (backend) portlarının boşta olduğunu kontrol eder.
3. Python sanal ortamını (`backend/venv`) ve frontend paketlerini (`frontend/node_modules`) otomatik kurar.
4. SQLite veritabanını (`data/gozel_esnaf.db`) WAL modunda ilklendirir.
5. Backend ve frontend servislerini başlatır.
6. Web tarayıcınızda `http://localhost:3000` adresini otomatik açar.

### Uygulamayı Durdurma (`stop.bat`)
Proje ana dizinindeki `stop.bat` dosyasına çift tıklayın:
- Gozel Esnaf için başlatılmış backend ve frontend arka plan süreçlerini güvenle sonlandırır.
- Bilgisayarınızda açık olan diğer programlara asla dokunmaz.

---

## 💾 Veritabanı ve Yedekleme Dizini

- **Canlı Veritabanı:** `data/gozel_esnaf.db` konuntadır. Yerel SQLite 3 formatında tutulur ve `.gitignore` ile Git'e eklenmesi engellenmiştir.
- **Yedek Deposu:** `backups/` klasöründe zaman damgalı (`gozel_esnaf_backup_YYYYMMDD_HHMMSS.db`) olarak saklanır.
- **Geri Yükleme Güvenliği:** Geri yükleme işleminde dosya SQLite bütünlük testinden geçirilir ve geri yüklemeden hemen önce mevcut çalışan veritabanının güvenlik yedeği otomatik alınır.

---

## ⚠️ Bilinen Sınırlamalar

1. **Çevrimdışı / Yerel Çalışma:** Uygulama tek bilgisayarda yerel SQLite üzerinde çalışır; çoklu cihaz senkronizasyonu veya bulut veritabanı eşitlemesi bulunmamaktadır.
2. **e-Fatura Entegrasyonu:** Resmî GİB e-Fatura / e-Arşiv entegrasyonu içermez.
3. **Ağ Erişimi:** Güvenlik amacıyla varsayılan olarak yalnızca `127.0.0.1` yerel makineden erişilebilir.

---

## 🧪 Testleri Çalıştırma

Backend birim ve entegrasyon testlerini çalıştırmak için:
```cmd
.\backend\venv\Scripts\python.exe -m pytest backend/tests -v
```

Frontend tip denetimi ve üretim derlemesi için:
```cmd
cd frontend
npm run build
```

---

## 📁 Dizin Yapısı

- `data/`: Canlı SQLite veritabanı dosyaları (`gozel_esnaf.db`).
- `backups/`: Veritabanı yedek dosyaları.
- `frontend/`: React + TypeScript kullanıcı arayüzü.
  - `public/logo.png`: Gozel Software resmi kurumsal logosu.
- `backend/`: FastAPI REST API ve SQLAlchemy modelleri.
- `scripts/`: Başlatma, durdurma ve veritabanı yönetim betikleri.
- `start.bat` & `stop.bat`: Windows tek tıkla çalıştırma ve durdurma araçları.
