# Transparansi Bukan Sekadar Janji: Bagaimana Raqio Mengubah Distribusi Token Menjadi Catatan Publik

*Problem, teknologi, solusi, dan mengapa distribusi token butuh lebih dari spreadsheet.*

---

## Problem: Janji Token Tanpa Bukti On-Chain

Di ekosistem crypto, distribusi token adalah momen kritis. Tim mengumumkan alokasi — untuk kontributor, komunitas, investor, atau likuiditas — tapi pengumuman itu biasanya berhenti di satu dokumen: spreadsheet, Medium post, atau slide deck.

Masalahnya bukan pada niatnya. Masalahnya ada di **gap antara apa yang dijanjikan dan apa yang bisa diverifikasi.**

Bayangkan skenario ini:

- Sebuah tim mengumumkan 1 juta token untuk kontributor selama 12 bulan. Tapi tidak ada yang bisa mengecek apakah token-nya sudah didepositkan ke mana pun.
- Airdrop diumumkan untuk 5.000 wallet. Tapi penerima tidak tahu kapan bisa klaim, apakah ada cliff, atau apakah alokasi bisa dibatalkan.
- Jadwal vesting ditulis di blog. Tapi saat tiba waktunya, pembayaran dilakukan manual — dan tergantung siapa yang ingat untuk mengirim.

Ini bukan masalah teknis yang jarang terjadi. Ini **pola sistemik** di industri token: release schedule yang tidak bisa diaudit, tidak on-chain, dan hanya bergantung pada kepercayaan terhadap satu pihak.

### Konsekuensi nyata

Ketika distribusi token bergantung pada proses manual:

1. **Penerima tidak punya kepastian.** Mereka hanya bisa percaya bahwa pengirim akan menjalankan jadwal sesuai rencana.
2. **Tim harus melakukan rekonsiliasi berulang.** Siapa yang sudah dibayar, berapa, kapan — semuanya jadi pekerjaan administratif yang rawan error.
3. **Komunitas tidak bisa memverifikasi.** Diskusi tentang alokasi menjadi spekulasi karena tidak ada sumber kebenaran yang bisa diperiksa semua pihak.
4. **Dispute sulit diselesaikan.** Tanpa catatan publik, perdebatan antara "sudah dikirim" dan "belum diterima" tidak punya referensi netral.

---

## Teknologi: Tiga Smart Contract dengan Tanggung Jawab Berbeda

Raqio menyelesaikan masalah ini bukan dengan menambah layer kepercayaan baru, tapi dengan **menghilangkan kebutuhan akan kepercayaan itu sendiri** — setidaknya untuk bagian mekanisme distribusi.

Raqio terdiri dari tiga smart contract yang di-deploy di Elysium Mainnet (Chain ID: 99901):

### 1. RaqioVault — Kustodi dan Aturan Pelepasan

RaqioVault adalah inti dari sistem. Contract ini menyimpan aset yang didepositkan dan mencatat kondisi pelepasannya secara on-chain.

**Apa yang dicatat:**
- Token yang dikunci
- Jumlah deposit (net setelah fee)
- Beneficiary (penerima) dan owner (pengelola) — dua peran yang terpisah
- Waktu mulai, cliff, dan waktu berakhir
- Pengaturan cancellation (bisa dibatalkan atau tidak)

**Prinsip desain yang penting:**

- **Time lock hanya bisa diperpanjang, tidak bisa diperpendek.** Kalau token dikunci sampai bulan ke-12, tidak ada yang bisa memajukan jadwal itu.
- **Beneficiary tidak bisa diganti.** Setelah stream dibuat, penerima bersifat permanen. Transfer ownership tidak mengubah siapa yang berhak klaim.
- **Tidak ada fungsi rescue.** Administrator tidak bisa menarik principal yang sudah dikunci. Ini by design — kustodi ada di tangan contract, bukan di tangan tim.
- **Aplikasi tidak memegang signing key.** User menandatangani transaksi dengan wallet mereka sendiri. Server tidak pernah memiliki akses untuk memindahkan aset.

### 2. RaqioAirdrop — Distribusi dengan Bukti Alokasi

Untuk distribusi massal, RaqioAirdrop menggunakan Merkle tree. Creator mendanai kampanye dan meng-commit Merkle root on-chain — sebuah komitmen kriptografis terhadap seluruh set alokasi tanpa menyimpan setiap detail di storage contract.

**Cara kerjanya:**
1. Creator menyiapkan daftar alokasi (wallet + jumlah)
2. Sistem menghasilkan Merkle root dari daftar tersebut
3. Root di-commit on-chain bersama dana kampanye
4. Setiap penerima membuktikan haknya dengan Merkle proof
5. Klaim bisa langsung (immediate) atau melalui vesting stream

**Yang membedakan:**
- Setiap wallet hanya bisa klaim sekali per kampanye
- Campaign yang sudah expired — creator bisa recovery sisa dana yang tidak diklaim
- Vested airdrop otomatis membuat stream di Vault, sehingga penerima mendapat jadwal pelepasan yang sama transparannya

**Tanggung jawab penting:** Merkle root ada on-chain, tapi daftar lengkap alokasi dan proof-nya tidak. Creator harus menyimpan dan mendistribusikan manifest-nya sendiri. Ini bukan kekurangan — ini pilihan desain yang menyeimbangkan biaya storage on-chain dengan skalabilitas.

### 3. RaqioScore — Indikator Komitmen

RaqioScore membaca data dari Vault dan menghasilkan skor komitmen berdasarkan lima komponen:

| Komponen | Poin Maksimal |
|---|---|
| Locked supply | 40 |
| Durasi lock tersisa (weighted) | 20 |
| LP lock terdaftar | 20 |
| Vesting aktif | 10 |
| Riwayat | 10 |

**Yang harus dipahami tentang skor ini:**
- Skor **hanya membaca data dari RaqioVault di Elysium Mainnet.** Token yang di-vest di platform lain tidak terhitung.
- Skor **bukan rating keamanan.** Skor tinggi tidak menjamin project aman, token bernilai, atau identitas owner terverifikasi.
- Contract menolak kalkulasi untuk token dengan lebih dari 256 record di Vault — lebih baik tidak menampilkan skor daripada menampilkan skor yang tidak lengkap.
- Asosiasi LP memerlukan registrasi administratif; NFT generik tidak dihitung sebagai bukti likuiditas terkunci.

Ini menjadikan skor sebagai **titik awal inspeksi**, bukan pengganti due diligence.

---

## Solusi: Dari Manual ke Mekanis

Raqio mengubah tiga workflow yang sebelumnya manual menjadi mekanis dan bisa diverifikasi:

### Problem → Solusi

**"Kapan token saya bisa diakses?"**
→ Jadwal vesting tercatat on-chain. Sebelum cliff: 0. Setelah cliff: akrual sejak start tersedia. Di akhir jadwal: seluruh alokasi sudah vested. Formula-nya deterministik — tidak ada interpretasi subjektif.

**"Apakah dana sudah benar-benar dialokasikan?"**
→ Token di-deposit ke Vault sebelum stream dimulai. Bukan janji di masa depan — dana sudah ada di contract. Siapa pun bisa memverifikasi deposit via on-chain data.

**"Apa yang terjadi kalau stream dibatalkan?"**
→ Untuk stream yang cancelable: token yang sudah vested tetap milik beneficiary, sisanya kembali ke owner. Untuk non-cancelable: tidak ada mekanisme pembatalan. Pengaturan ini tercatat saat stream dibuat dan tidak bisa diubah setelahnya.

**"Bagaimana distribusi ke ribuan wallet?"**
→ Merkle airdrop — satu transaksi untuk commit seluruh kampanye, klaim individual dengan proof. Opsional: klaim langsung atau melalui vesting.

**"Bagaimana saya tahu bahwa record ini benar?"**
→ Wallet, jumlah, timing, calldata, dan event semuanya publik. Deployment record, alamat contract, dan ABI dipublikasikan. Siapa pun bisa membaca data langsung dari chain.

---

## Mengapa Harus Raqio?

### 1. Transparansi yang Bisa Diaudit, Bukan Narasi

Banyak project menyebut "transparansi" sebagai nilai inti. Tapi transparansi tanpa mekanisme verifikasi hanya narasi.

Raqio memberikan **transparansi struktural**: setiap lock, stream, dan kampanye airdrop tercatat dalam smart contract yang bisa dibaca siapa pun. Bukan PDF yang di-upload, bukan blog post yang bisa diedit — catatan on-chain yang immutable setelah dibuat.

Seorang penerima bisa menjawab pertanyaan "apa yang tersedia untuk saya sekarang?" tanpa bertanya ke siapa pun. Seorang observer bisa membedakan antara komitmen yang sudah didanai dan yang masih rencana.

### 2. Pemisahan Peran yang Jelas

Di banyak sistem distribusi, satu pihak mengontrol segalanya. Raqio memisahkan:

- **Owner** — melakukan aksi manajemen yang diizinkan contract
- **Beneficiary** — satu-satunya yang bisa klaim principal
- **Contract** — menegakkan aturan tanpa intervensi manusia

Transfer ownership tidak mengubah beneficiary. Tidak ada fungsi untuk mengganti penerima setelah stream dibuat. Ini mengurangi attack surface dan konflik kepentingan.

### 3. Aturan yang Tidak Bisa Dilanggar Sepihak

- Time lock tidak bisa diperpendek
- Beneficiary tidak bisa diganti
- Non-cancelable stream tidak bisa dihentikan
- Fee perubahan butuh 48 jam delay dengan cap 50bps
- Administrator tidak bisa menarik principal yang dikunci

Ini bukan fitur — ini **constraint** yang membuat sistem bisa dipercaya. Ketika aturan bisa dilanggar oleh satu pihak, transparansi kehilangan maknanya.

### 4. Satu Produk untuk Tiga Kebutuhan

Daripada menggunakan tool terpisah untuk locking, vesting, dan airdrop — masing-masing dengan interface, risiko, dan keterbatasan berbeda — Raqio menyatukan ketiganya dalam satu sistem yang saling terhubung:

- Airdrop bisa langsung membuat vesting stream di Vault
- Score membaca data langsung dari Vault
- Semua record ada di chain yang sama, bisa diaudit secara holistik

### 5. Fee yang Transparan dan Terbatas

Creation fee sebesar 25bps (0.25%) untuk ERC-20 lock dan stream. Fee ini:
- Bisa dibaca on-chain sebelum deposit
- Perubahannya butuh 48 jam delay
- Tidak bisa melebihi 50bps
- Tidak dikenakan untuk penambahan ke time lock yang sudah ada atau kustodi NFT

Penerima juga perlu membayar gas saat klaim. Kedua biaya ini seharusnya dikomunikasikan dengan jelas — dan Raqio memungkinkan itu karena semua parameternya bisa dibaca.

---

## Transparansi Juga Berarti Jujur Tentang Batasan

Raqio mempublikasikan batasannya dengan jelas, dan itu sendiri adalah bentuk transparansi:

**Apa yang TIDAK dilakukan Raqio:**
- Tidak menjamin token punya nilai atau demand pasar
- Tidak memverifikasi identitas owner atau beneficiary
- Tidak mendeteksi fraud atau rug pull
- Tidak mendukung token dengan transfer tax, rebase, atau mekanisme non-standar
- Tidak menyediakan shielded pool atau anonimitas — semua data publik
- Tidak menggantikan audit keamanan independen
- Tidak mendukung cross-chain distribution (di luar scope tiga contract ini)
- Tidak memiliki batch stream creation

**Risiko yang tetap ada:**
- Contract risk — deployment receipt dan regression test bukan pengganti audit independen
- Token risk — perilaku token yang didepositkan di luar kendali Vault
- Wallet security — tanggung jawab user
- Timestamp dependency — eligibility ditentukan oleh timestamp chain

Menyembunyikan batasan ini akan bertentangan dengan prinsip transparansi yang Raqio bangun. Sebaliknya, mempublikasikannya membantu user membuat keputusan yang informed.

---

## Studi Kasus: Bagaimana Raqio Mengubah Workflow

### Sebelum Raqio

1. Tim menulis jadwal vesting di Google Doc
2. Finance mengirim token manual setiap bulan
3. Penerima bertanya "sudah dikirim belum?" via DM
4. Diskrepansi antara record tim dan realita transfer
5. Tidak ada cara bagi pihak ketiga untuk memverifikasi

### Dengan Raqio

1. Tim membuat vesting stream di Vault — token langsung di-deposit
2. Jadwal tercatat on-chain: start, cliff, end, cancellation setting
3. Penerima bisa cek kapan saja berapa yang sudah vested dan claimable
4. Klaim dilakukan sendiri oleh penerima saat token tersedia
5. Siapa pun bisa memverifikasi dari data on-chain

**Yang berubah bukan teknologinya saja — tapi distribusi tanggung jawab.** Tim tidak perlu lagi menjadi perantara untuk setiap pembayaran. Penerima tidak perlu lagi bergantung pada good faith untuk setiap rilis.

---

## Penutup: Clear Terms Are Part of the Product

Jadwal distribusi token seharusnya menjawab lebih dari "berapa banyak?"

Ia harus menjelaskan kapan alokasi bisa diakses, apakah sudah didanai, siapa yang bisa klaim, apa yang bisa diubah, dan kondisi apa yang di luar kendali sistem.

Raqio mengubah pertanyaan-pertanyaan ini menjadi workflow yang konkret: aset yang di-deposit, jadwal yang eksplisit, klaim oleh penerima, dan catatan publik yang bisa diperiksa.

Untuk tim dan penerima yang membutuhkan workflow ini di Elysium, nilainya praktis: **lebih sedikit ambiguitas antara pengumuman alokasi dan mekanisme pelepasan yang bisa diinspeksi semua orang.**

**Your tokens. Your timeline.**

---

Pelajari mekanismenya di [raqio.xyz/docs](https://raqio.xyz/docs), periksa [public locks](https://raqio.xyz/explore), dan baca [security scope](https://raqio.xyz/security) sebelum membuat komitmen.

---

*Catatan editorial: artikel ini disusun berdasarkan technical whitepaper Raqio (8 November 2026) dan implementasi contract yang sudah di-deploy. Fee dan konfigurasi administratif yang disebutkan adalah nilai saat deployment; nilai terkini harus dicek on-chain.*

### Referensi

- [Technical whitepaper](../whitepaper.md)
- [Deployment record](../../contracts/deployments/elysium-mainnet-99901.json)
- [RaqioVault](../../contracts/src/RaqioVault.sol)
- [RaqioAirdrop](../../contracts/src/RaqioAirdrop.sol)
- [RaqioScore](../../contracts/src/RaqioScore.sol)
