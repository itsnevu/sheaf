# Mengenal Raqio: Dari Janji Distribusi Token ke Aturan yang Bisa Diperiksa

*Apa itu Raqio, bagaimana token lock, vesting, dan airdrop bekerja, serta mengapa kejelasan jadwal sama pentingnya dengan besarnya alokasi.*

Sebuah proyek mengumumkan bahwa sebagian tokennya dialokasikan untuk tim, kontributor, dan komunitas. Angkanya terlihat jelas. Ada persentase, ada grafik distribusi, dan ada tanggal yang ditulis dalam sebuah pengumuman.

Namun, bagi orang yang akan menerima token, masih ada pertanyaan yang lebih praktis: apakah tokennya sudah disediakan? Kapan token tersebut bisa diambil? Apakah semuanya tersedia sekaligus? Siapa yang boleh mengubah atau menghentikan distribusinya? Di mana ketentuannya bisa diperiksa?

Pertanyaan itu memperlihatkan jarak antara sebuah alokasi dan sebuah mekanisme distribusi. Mengumumkan jumlah token belum menjelaskan bagaimana hak penerima akan dijalankan.

Raqio dibangun untuk menangani bagian tersebut: menghubungkan token yang benar-benar disetorkan dengan aturan waktu, hak penerima, dan catatan publik yang bisa diperiksa.

## 1. Apa itu Raqio?

**Raqio adalah platform untuk mengunci token, mengatur pelepasan token secara bertahap, dan menjalankan distribusi airdrop berbasis smart contract di Elysium Mainnet.**

Dalam implementasi yang dibahas di artikel ini, Raqio menggunakan jaringan dengan chain ID **99901**. Pengguna berinteraksi melalui website dan wallet, sementara ketentuan penyimpanan serta pelepasan aset dijalankan oleh kontrak di blockchain.

Ada tiga komponen utama: **RaqioVault**, yang menyimpan aset dan menjalankan aturan penguncian atau vesting; **RaqioAirdrop**, yang mengelola kampanye distribusi dengan bukti alokasi; dan **RaqioScore**, yang membaca catatan Vault untuk menghasilkan indikator komitmen yang cakupannya terbatas.

Melalui susunan ini, sebuah rencana distribusi dapat memiliki hubungan yang lebih jelas dengan dana yang tersedia. Ketika pembuat membuat lock atau stream, aset yang didukung disetorkan ke kontrak. Penerima kemudian berinteraksi dengan kontrak untuk mengambil bagian yang sudah menjadi haknya sesuai ketentuan.

Website membantu pengguna mengisi parameter, menyetujui transaksi, dan membaca hasilnya. Website bukan tempat pengguna menyerahkan private key kepada operator Raqio. Transaksi ditandatangani melalui wallet pengguna.

Meski demikian, istilah ini perlu dipahami dengan tepat: selama terkunci, aset berada dalam custody smart contract. Kepemilikan private key tetap pada pengguna, tetapi aset yang telah disetorkan mengikuti aturan kontrak tersebut.

## 2. Masalah yang ingin diselesaikan: distribusi token punya dimensi waktu

Distribusi token sering dibicarakan sebagai persoalan pembagian jumlah. Tim mendapat bagian tertentu, investor mendapat bagian lain, dan komunitas mendapat alokasi tersendiri.

Dalam praktiknya, keputusan tentang waktu sama pentingnya. Dua alokasi yang sama-sama berjumlah 100.000 token bisa memiliki arti yang sangat berbeda jika yang pertama tersedia hari ini, sedangkan yang kedua baru bisa diambil bertahap selama satu tahun.

Perbedaan lain muncul ketika salah satunya sudah didanai ke dalam kontrak, sementara yang lain masih bergantung pada transfer manual di masa depan. Bagi penerima, keduanya membawa kondisi operasional yang berbeda meskipun angka dalam pengumumannya sama.

Distribusi manual juga menambah pekerjaan administratif. Seseorang harus menyimpan daftar penerima, menghitung bagian yang jatuh tempo, melakukan transfer, lalu memperbarui catatan. Ketika peserta bertambah atau jadwal berubah, pertanyaan sederhana seperti “berapa yang sudah dibayar?” dapat membutuhkan rekonsiliasi dari beberapa sumber.

Raqio menawarkan mekanisme yang menghubungkan empat hal: aset yang disediakan, aturan waktunya, wallet yang berhak menerima, dan riwayat tindakan yang terjadi. Mekanisme ini membantu memperjelas pelaksanaan distribusi yang telah didanai.

Hal itu tidak membuat setiap keputusan proyek menjadi benar. Pembuat tetap harus memilih parameter yang sesuai, mengomunikasikan ketentuan, dan memastikan asetnya kompatibel. Manfaatnya adalah ketentuan tersebut dapat diwujudkan dalam catatan kontrak yang bisa diperiksa bersama.

## 3. Empat istilah dasar sebelum menggunakan Raqio

### Alokasi

Alokasi menjelaskan jumlah token yang ditetapkan untuk seseorang atau suatu kelompok. Misalnya, seorang kontributor memperoleh alokasi 12.000 token.

Informasi ini belum cukup untuk menentukan apakah token tersebut sudah tersedia di wallet, sudah didanai ke kontrak, atau baru akan disediakan kemudian. Jadwal dan mekanisme penyerahannya masih harus dijelaskan.

### Token lock

Token lock menyimpan aset sampai waktu pembukaan tertentu. Sebelum waktu itu, penerima belum bisa menarik aset melalui mekanisme klaim lock. Setelah waktunya tercapai, beneficiary dapat melakukan klaim sesuai aturan kontrak.

Lock cocok untuk kebutuhan yang memiliki satu batas waktu pelepasan yang tegas. Dana tidak harus dilepas sedikit demi sedikit selama periode penguncian.

### Vesting atau stream

Vesting mengatur terbentuknya hak atas token sepanjang waktu. Pada stream linear, jumlah yang menjadi hak penerima bertambah secara proporsional dari waktu mulai sampai waktu selesai.

Istilah “stream” menggambarkan perhitungan hak yang berkembang seiring waktu. Dalam implementasi Raqio, penerima tetap melakukan transaksi klaim untuk memindahkan token yang tersedia ke wallet. Token tidak otomatis dikirim setiap detik.

### Airdrop

Airdrop adalah distribusi berdasarkan daftar penerima dan alokasi. Raqio mendukung kampanye dengan pembayaran langsung saat klaim maupun kampanye yang membuat stream vesting setelah penerima mengklaim alokasinya.

Dengan demikian, keputusan tentang siapa yang menerima dapat dipisahkan dari keputusan tentang kapan token menjadi tersedia. Distribusi untuk banyak wallet tidak harus berarti seluruh token langsung bebas digunakan pada saat yang sama.

## 4. RaqioVault: tempat aset disimpan dan aturan pelepasan dijalankan

RaqioVault merupakan bagian inti dari mekanisme penguncian dan vesting. Kontrak ini menyimpan catatan tentang aset, jumlah, pembuat atau pengelola lock, beneficiary, waktu mulai, waktu selesai, serta status klaimnya.

Setiap lock memiliki identitas yang bisa digunakan untuk membuka catatan publiknya. Untuk stream, catatan juga mencakup cliff dan apakah pembatalan diizinkan sejak awal.

### Penguncian token ERC-20

Pembuat menyetorkan token ERC-20 yang didukung, menentukan waktu pembukaan, dan menetapkan beneficiary. Setelah transaksi terkonfirmasi, aset bersih setelah biaya penciptaan mengikuti ketentuan lock.

Pada time lock yang didukung, pemilik lock dapat memperpanjang waktu penguncian. Kontrak tidak menyediakan cara memperpendeknya melalui fungsi perpanjangan tersebut. Penambahan token ke time lock ERC-20 yang memenuhi syarat juga tersedia.

Karena memperpanjang waktu berarti penerima menunggu lebih lama, hak pengelolaan ini perlu dipahami sebelum membuat atau menerima suatu lock.

### Penguncian LP dan custody NFT

RaqioVault juga mendukung penguncian LP berbentuk ERC-20 serta custody ERC-721. LP merupakan representasi posisi likuiditas; bentuk dan hak yang melekat padanya bergantung pada protokol asalnya.

Dukungan ini memiliki batas yang jelas. Menyimpan sebuah NFT di Vault tidak membuktikan bahwa NFT tersebut merupakan posisi likuiditas yang autentik dari pool tertentu. Implementasi custody generik juga tidak otomatis menyediakan penilaian likuiditas, pengambilan trading fee, atau dukungan khusus untuk seluruh fitur DEX.

Karena itu, bukti bahwa suatu posisi dikunci perlu dibaca bersama identitas aset dan fungsi yang benar-benar didukung. Sebuah lock menjelaskan pembatasan atas aset tertentu, bukan keseluruhan kondisi ekonomi suatu proyek.

## 5. Vesting linear dan cliff: bagaimana hak penerima dihitung?

Vesting linear menjawab pertanyaan “berapa bagian yang sudah menjadi hak penerima pada suatu waktu?” dengan aturan yang mengikuti waktu mulai dan waktu selesai.

Cliff menambahkan batas awal sebelum hak tersebut dapat diklaim. Dalam implementasi Raqio, sebelum cliff tercapai, nilai vested adalah nol. Ketika cliff tercapai, akrual sejak waktu mulai menjadi tersedia. Perhitungan kemudian berlanjut secara linear sampai akhir.

Artinya, cliff tidak selalu berarti perhitungan linear baru dimulai setelah cliff. Hubungan antara start, cliff, dan end harus dibaca sebagai satu rangkaian ketentuan.

### Contoh: 12.000 token bersih selama 360 hari

Anggap sebuah stream berisi **12.000 token bersih setelah biaya**, berlangsung 360 hari, dan memiliki cliff 90 hari. Contoh ini memakai hari agar tidak menyamakan semua bulan kalender sebagai periode yang panjangnya sama.

Sebelum hari ke-90, belum ada token yang dapat diklaim. Pada hari ke-90, seperempat durasi telah berlalu, sehingga 3.000 token menjadi vested. Pada hari ke-180, total vested menjadi 6.000 token. Pada hari ke-360, seluruh 12.000 token telah vested.

Jumlah yang bisa diklaim saat ini masih harus dikurangi klaim sebelumnya. Jika penerima sudah mengambil 3.000 token pada hari ke-90, maka pada hari ke-180 ia bisa mengambil tambahan 3.000 token.

Empat angka berikut perlu dibedakan: alokasi atau jumlah yang dijanjikan; jumlah bersih yang masuk ke stream; jumlah yang sudah vested; dan jumlah yang sudah benar-benar diklaim. Menggabungkan semuanya sebagai “saldo” dapat membuat kondisi distribusi sulit dipahami.

Perhitungan kontrak menggunakan timestamp blockchain dan satuan integer token. Contoh di atas menyederhanakan jadwal pada titik waktu yang tepat; nominal di antarmuka juga mengikuti decimals token dan pembulatan kontrak.

### Apa yang terjadi jika penerima belum melakukan klaim?

Token yang sudah vested dan belum diklaim tetap berada di Vault. Penerima dapat melakukan klaim atas jumlah yang tersedia sesuai keadaan stream dan kemampuan token untuk ditransfer.

Klaim memerlukan transaksi dan gas. Ketersediaan hak secara waktu tidak menghilangkan kebutuhan akan wallet yang benar, jaringan yang sesuai, dan token yang tidak memblokir transfer.

## 6. Owner, beneficiary, dan pembatalan stream

Dalam Raqio, owner lock dan beneficiary memiliki peran berbeda. Owner mengelola tindakan yang diizinkan oleh tipe lock. Beneficiary merupakan alamat yang berhak menerima aset melalui mekanisme klaim.

Alamat keduanya dapat sama, tetapi pemisahan peran tetap penting. Sebagai contoh, sebuah tim dapat membuat stream untuk seorang kontributor: tim menjadi owner stream, sedangkan wallet kontributor menjadi beneficiary.

Pemindahan ownership lock tidak mengubah beneficiary. Kontrak Vault yang diperiksa juga tidak memiliki fungsi untuk mengganti beneficiary stream. Karena itu, alamat penerima perlu dipastikan benar sebelum transaksi dibuat.

### Stream yang boleh dibatalkan

Pembuat dapat memilih apakah sebuah stream bersifat cancelable. Jika pembatalan diaktifkan, owner saat itu dapat menghentikan bagian yang belum vested melalui fungsi pembatalan.

Ketika dibatalkan, bagian yang sudah vested tetapi belum diklaim dibayarkan kepada beneficiary. Bagian yang belum vested dikembalikan kepada owner stream saat itu.

Kembali ke contoh 12.000 token: jika pembatalan terjadi tepat pada hari ke-180, total vested adalah 6.000 token. Jika penerima sudah mengklaim 3.000 token sebelumnya, pembatalan membayarkan 3.000 token sisanya kepada penerima dan mengembalikan 6.000 token yang belum vested kepada owner.

Pada stream dengan cliff, pembatalan sebelum cliff memiliki konsekuensi berbeda: karena nilai vested masih nol, belum ada bagian vested yang menjadi pembayaran kepada beneficiary.

Ketentuan ini layak dibaca sejak awal. Dua stream dengan jumlah dan durasi yang sama dapat memberikan kepastian berbeda jika hanya salah satunya boleh dibatalkan.

### Stream yang tidak boleh dibatalkan

Jika stream dibuat tanpa hak pembatalan, fungsi pembatalan tersebut tidak tersedia bagi owner. Pada implementasi yang diperiksa, stream juga tidak dapat diperpanjang atau ditambah dananya melalui fungsi pengelolaan time lock.

Jika tim membutuhkan perubahan alokasi di kemudian hari, kebutuhan itu harus direncanakan dengan mempertimbangkan batas tersebut. Menganggap seluruh jenis lock memiliki hak pengelolaan yang sama dapat menimbulkan ekspektasi yang keliru.

## 7. RaqioAirdrop: kampanye yang didanai dengan bukti alokasi

RaqioAirdrop menangani distribusi kepada sejumlah penerima menggunakan struktur bukti bernama Merkle tree. Pembuat menyiapkan daftar wallet beserta alokasinya, lalu perangkat di browser menghasilkan root dan proof untuk setiap penerima.

Merkle root dapat dipahami sebagai komitmen ringkas terhadap daftar tersebut. Saat mengklaim, penerima mengirimkan jumlah alokasi serta proof yang harus sesuai dengan wallet yang melakukan klaim.

Kontrak memeriksa kecocokan bukti, status klaim wallet, sisa dana kampanye, dan batas waktu kampanye. Satu wallet hanya dapat mengklaim alokasi airdrop satu kali dalam kampanye yang sama.

Perlindungan ini mencegah klaim ulang atas alokasi yang sama. Namun, ketepatan dan kecukupan daftar tetap menjadi tanggung jawab pembuat kampanye. Menghasilkan root yang valid tidak otomatis menjamin pembagian alokasi telah dibuat secara adil atau semua alokasi didanai dengan jumlah yang cukup.

### Distribusi langsung atau menggunakan vesting

Dalam kampanye langsung, token dibayarkan kepada wallet penerima ketika klaim berhasil.

Dalam kampanye dengan vesting, klaim airdrop membuat stream baru di RaqioVault. Beneficiary stream adalah wallet yang mengklaim, sedangkan ownership stream diberikan kepada pembuat kampanye. Jika pembatalan diaktifkan, ketentuan pembatalannya mengikuti aturan stream tadi.

Ada detail waktu yang penting: pada implementasi ini, stream airdrop dibuat dengan waktu mulai ketika klaim tersebut dieksekusi. Penerima yang melakukan klaim pada waktu berbeda dapat memiliki waktu mulai dan selesai yang berbeda, meskipun durasi vesting kampanyenya sama.

Klaim alokasi airdrop satu kali juga berbeda dari klaim token vested. Sesudah memperoleh stream, penerima dapat melakukan beberapa klaim atas token yang tersedia sepanjang masa vesting.

### File proof harus disimpan dan dibagikan

Blockchain menyimpan root kampanye, bukan seluruh file proof yang bisa diunduh penerima. Pembuat perlu menyimpan manifest alokasi dan proof, lalu menyediakan bukti yang sesuai kepada penerima.

Tanpa distribusi proof yang baik, kampanye bisa memiliki dana dan root di kontrak tetapi tetap sulit digunakan oleh peserta. Pengalaman penerima mencakup akses ke bukti, petunjuk klaim, dan pemahaman terhadap jadwal.

Input alokasi menggunakan satuan dasar token dalam bentuk integer. Nominal tampilan seperti “1,5 token” perlu dikonversi sesuai decimals sebelum dimasukkan ke format yang mengharapkan base units.

### Batas waktu dan dana yang belum diklaim

Kampanye memiliki waktu kedaluwarsa. Setelah batas itu tercapai, klaim airdrop baru ditolak, dan pembuat dapat memulihkan sisa dana kampanye yang belum diklaim.

Batas klaim kampanye berbeda dari akhir vesting stream yang sudah dibuat. Token yang telah masuk ke stream mengikuti jadwal stream tersebut, bukan diperlakukan sebagai sisa kampanye yang belum diklaim.

## 8. RaqioScore: indikator komitmen yang perlu dibaca bersama konteks

RaqioScore membaca catatan Vault untuk menghitung indikator berdasarkan fakta penguncian dan vesting. Sumber perhitungannya bukan angka yang sekadar dimasukkan oleh seorang pelapor.

Komponennya memberi bobot sampai 40 poin untuk proporsi suplai yang terkunci, 20 poin untuk sisa durasi yang dibobot menurut jumlah, 20 poin untuk LP terdaftar yang dikunci, 10 poin untuk penggunaan vesting aktif, serta 10 poin untuk komponen riwayat.

Angka ini membantu merangkum sebagian bentuk komitmen yang tercatat di Vault. Pembaca dapat menggunakannya sebagai titik awal untuk membuka fakta di baliknya: berapa yang dikunci, berapa lama, dan catatan apa yang memengaruhi hasilnya.

Cakupannya tetap terbatas. Skor tidak membuktikan identitas tim, keamanan kode token, keaslian seluruh posisi likuiditas, nilai pasar aset, atau perilaku proyek di masa depan. Hubungan LP yang dihitung memerlukan registrasi administrator, sedangkan NFT generik tidak otomatis memperoleh poin LP.

Catatan di luar Vault juga tidak serta-merta tercakup. Karena siapa pun dapat membuat lock, unsur riwayat permissionless dapat dipengaruhi oleh pihak ketiga.

Implementasi saat ini menetapkan batas 256 catatan Vault yang terindeks untuk sebuah token dalam perhitungan tersebut. Jika batas dilewati, perhitungan ditolak daripada menampilkan angka dari data yang tidak lengkap. Ini adalah batas teknis yang memerlukan solusi pengindeksan atau agregasi tersendiri untuk skala lebih besar.

Karena itu, istilah “indikator komitmen” lebih tepat untuk menjelaskan fungsi skor ini. Hasilnya tidak menggantikan pemeriksaan terhadap aset dan proyek yang bersangkutan.

## 9. Bagaimana alur penggunaannya?

Bagi pembuat lock atau stream, proses dimulai dari memilih tujuan: penguncian sampai satu waktu, penguncian LP atau NFT, atau vesting bertahap. Setelah itu, pengguna menghubungkan wallet ke jaringan yang sesuai dan menentukan aset serta parameter.

Untuk stream, parameter penting mencakup token, jumlah deposit, beneficiary, durasi, cliff, dan hak pembatalan. Form website yang diperiksa memulai stream pada saat transaksi dieksekusi; integrasi yang memanggil kontrak langsung dapat memberikan waktu mulai di masa depan.

Wallet kemudian digunakan untuk memberi izin penggunaan aset yang diperlukan dan menandatangani transaksi pembuatan. Antarmuka menunggu konfirmasi serta membaca event transaksi untuk mendapatkan ID lock yang dibuat.

Setelah lock tersedia, pembuat dapat membagikan catatan publiknya. Penerima memeriksa alamat token, beneficiary, jumlah bersih, jadwal, dan ketentuan pembatalan sebelum mengandalkan distribusi tersebut.

Pada sisi penerima, wallet yang digunakan harus sesuai dengan beneficiary. Catatan dapat dibaca tanpa melakukan transaksi, tetapi klaim membutuhkan tanda tangan transaksi dan gas. Konfigurasi wallet project menggunakan HYPE untuk gas jaringan Elysium tersebut.

Untuk airdrop, penerima juga membutuhkan campaign ID, nominal alokasi dalam satuan yang benar, dan proof yang cocok. Menghubungkan wallet saja tidak membuat sebuah alamat menjadi eligible jika tidak memiliki alokasi yang sesuai dengan root kampanye.

## 10. Contoh penggunaan dalam kebutuhan nyata

### Alokasi untuk tim dan kontributor

Sebuah tim dapat menyediakan alokasi token untuk kontributor melalui stream yang telah didanai. Kontributor bisa melihat jumlah bersih, jadwal, serta hak pembatalannya tanpa hanya bergantung pada spreadsheet internal.

Manfaatnya adalah pelaksanaan alokasi menjadi lebih mudah diperiksa. Ketentuan kompensasi di luar token, kualitas kerja, dan hubungan antara pihak-pihak terkait tetap membutuhkan kesepakatan tersendiri.

### Distribusi komunitas dengan waktu pelepasan berbeda

Sebuah komunitas dapat menjalankan airdrop langsung untuk peserta yang memenuhi syarat. Jika distribusi membutuhkan pelepasan bertahap, kampanye dapat menggunakan vesting.

Pembuat perlu menjelaskan bahwa klaim pertama membuat stream, kapan stream mulai berjalan, berapa alokasi bersih setelah biaya, dan kapan peserta perlu kembali untuk mengambil token vested. Informasi seperti ini mengurangi kebingungan setelah pengumuman alokasi.

### Penguncian cadangan atau posisi likuiditas tertentu

Pemegang token atau LP yang didukung dapat menggunakan time lock untuk menetapkan batas waktu pelepasan. Catatannya kemudian dapat dibagikan kepada pihak yang perlu memahami komitmen atas aset tersebut.

Interpretasinya harus spesifik: aset yang dikunci adalah aset yang tercatat pada lock tersebut. Catatan itu tidak membuktikan bahwa seluruh cadangan proyek dikunci atau seluruh risiko atas likuiditasnya hilang.

### Pencatatan dan rekonsiliasi

Bagi tim operasional, lock ID, wallet, nominal, serta transaksi klaim menyediakan bahan pencatatan yang bisa dirujuk kembali. Informasi ini dapat membantu mencocokkan alokasi dengan status pelaksanaannya.

Kegunaan operasional itu tidak otomatis membuat semua kewajiban pelaporan selesai. Cara organisasi mengklasifikasikan dan membukukan transaksi tetap merupakan pekerjaan yang terpisah dari fungsi kontrak.

## 11. Biaya protokol, nilai bersih, dan gas

Pada pemeriksaan baca langsung tanggal **11 November 2026**, RaqioVault mengembalikan fee sebesar **25 basis points**, setara **0,25%**, untuk pembuatan lock dan stream ERC-20 yang dikenai biaya tersebut.

Jika deposit bruto berjumlah 10.000 token dengan tarif 0,25%, maka biaya protokolnya 25 token dan jumlah bersih yang mengikuti ketentuan lock atau vesting adalah 9.975 token. Angka bruto dan bersih perlu dibedakan saat mengomunikasikan hak penerima.

Kontrak menetapkan batas fee 50 basis points atau 0,5%. Perubahan fee menggunakan jeda 48 jam sebelum dapat dieksekusi. Nilai aktual tetap perlu dibaca saat membuat transaksi karena tarif dapat berubah melalui mekanisme tersebut.

Custody NFT dan penambahan aset ke time lock ERC-20 yang memenuhi syarat tidak dikenai biaya penciptaan ERC-20 tersebut. Transaksinya tetap membutuhkan gas jaringan.

Pada airdrop dengan vesting, alokasi kampanye merupakan nilai bruto yang digunakan untuk membuat stream. Fee Vault yang berlaku ketika penerima mengklaim dan membuat stream dipotong sebelum vesting, sehingga nilai bersihnya dapat berbeda dari angka bruto dalam daftar alokasi.

Airdrop langsung tidak membuat stream Vault sehingga tidak memicu biaya pembuatan stream itu. Hal ini juga tidak berarti transaksi klaim bebas gas.

Biaya protokol dan gas adalah dua komponen berbeda. Yang pertama mengikuti aturan biaya kontrak; yang kedua diperlukan untuk menjalankan transaksi di jaringan. Keberadaan biaya deposit ini tidak membuktikan adanya pembagian pendapatan kepada pemegang token RAQIO.

## 12. Transparansi: apa yang benar-benar dapat diperiksa?

Pada lock yang telah didanai, pihak lain dapat memeriksa hubungan antara aset, jumlah, owner, beneficiary, waktu, dan status yang tercatat. Transaksi serta event menyediakan riwayat tindakan seperti pembuatan, klaim, perpanjangan, atau pembatalan.

Hal ini mengubah kualitas informasi yang tersedia. Pernyataan bahwa “alokasi sudah disiapkan” dapat disandingkan dengan catatan deposit dan ketentuan yang konkret.

Namun, catatan publik hanya menjelaskan apa yang memang dicatat. Ia tidak membuktikan niat seseorang, memastikan proyek akan mencapai target bisnis, atau menentukan harga token di masa depan. Sebuah jadwal pelepasan mengatur hak atas aset tertentu; jadwal itu tidak menciptakan permintaan pasar.

Privasi juga harus dijelaskan dengan akurat. Alamat wallet, jumlah, waktu, calldata, dan event transaksi tetap dapat terlihat di blockchain. Root airdrop bukan mekanisme yang dengan sendirinya menyembunyikan seluruh kegiatan distribusi.

Karena itu, Raqio tidak layak digambarkan sebagai platform yang menjamin anonimitas atau membuat transaksi tidak dapat dilacak. Manfaat utama mekanisme yang dibahas di sini adalah keterbacaan ketentuan dan pelaksanaannya.

## 13. Batas teknis dan keamanan yang merupakan bagian dari produk

Kompatibilitas token menjadi salah satu batas penting. Vault memerlukan akuntansi deposit yang tepat dan menolak deposit ERC-20 yang datang dengan jumlah berkurang karena pajak transfer. Token rebasing serta perilaku token nonstandar lainnya tidak didukung sebagai asumsi umum.

Token yang memiliki pause, blacklist, atau pembatasan transfer juga dapat membuat transfer klaim gagal meskipun waktunya telah memenuhi ketentuan. Aturan vesting tidak menghapus kewenangan yang mungkin ada pada kontrak token itu sendiri.

Smart contract menyimpan dan menjalankan ketentuan, tetapi tetap merupakan perangkat lunak yang perlu ditinjau. Dokumentasi project yang diperiksa belum menetapkan adanya laporan audit keamanan independen. Pengujian internal dan keberhasilan deployment memiliki fungsi berbeda dari audit pihak independen.

Vault tidak menyediakan fungsi rescue administratif untuk menarik principal yang terkunci. Administrator tetap memiliki kewenangan tertentu, antara lain mengatur penerima fee, mengusulkan perubahan fee yang tunduk pada jeda waktu, serta mengonfigurasi sumber Vault dan asosiasi LP pada Score.

Pemisahan kewenangan ini membantu menjelaskan siapa dapat melakukan apa. Membaca hak administrator tetap relevan meskipun tidak ada fungsi penarikan principal tersebut.

Kesalahan parameter juga memiliki konsekuensi. Beneficiary yang keliru, jaringan yang salah, token yang salah, atau jadwal yang tidak sesuai kebutuhan tidak otomatis bisa diperbaiki setelah transaksi. Beberapa pengaturan memang memiliki fungsi pengelolaan, tetapi kontrak tidak menyediakan tombol edit untuk semua keputusan awal.

## 14. Status produk: membedakan implementasi utama, fitur lama, dan proposal

Pemeriksaan RPC tanggal 11 November 2026 mengonfirmasi bytecode pada tiga alamat kontrak Raqio di chain 99901. RaqioAirdrop dan RaqioScore juga mengembalikan referensi ke alamat RaqioVault yang sama dengan catatan deployment project.

Tiga alamat yang menjadi rujukan implementasi ini adalah:

- **RaqioVault:** `0x7dA7CA57a86C977a9CfAf3826b257aA9C6aD1C77`.
- **RaqioAirdrop:** `0xCf32A62308ce25691CFcc129B52B8a6424462184`.
- **RaqioScore:** `0x4b5b48e5ffF7FeC9B9D1978966B2966ac5ab11C8`.

Pemeriksaan tersebut mengonfirmasi keberadaan kode dan beberapa parameter yang dibaca. Pemeriksaan itu bukan pengujian semua fungsi, audit keamanan, atau konfirmasi bahwa setiap deployment website publik telah memakai source terbaru.

Repo juga masih menyimpan execution desk versi lama dengan workflow operasi dan integrasi routing yang terpisah. Dokumentasi menyatakan kontrak legacy seperti PrivateClaim, StealthDesk, OtcEscrow, dan DelegatedTreasury berada di luar deployment tiga kontrak utama ini. Fitur lama itu tidak tepat dipakai sebagai dasar untuk mengklaim semua kemampuan sudah terintegrasi ke produk Vault terbaru.

Mode demo pada desk lama juga tidak mengubah transaksi Vault dan Airdrop menjadi simulasi. Ketika pengguna menandatangani pemanggilan kontrak mainnet melalui halaman tersebut, transaksi dapat menggunakan aset nyata.

Untuk tokenomics, rilis yang diperiksa tidak mencakup deployment token RAQIO, staking, governance, diskon fee berbasis staking, buyback, atau distribusi burn. Dokumen tokenomics di repo menandai hal-hal tersebut sebagai proposal.

Rencana seperti validasi LP khusus DEX, pengindeksan berskala lebih besar, dan integrasi lintas jaringan juga perlu dinilai menurut implementasinya masing-masing. Menuliskan suatu kemampuan dalam dokumen pengembangan tidak membuatnya otomatis tersedia bagi pengguna.

## 15. Pertanyaan yang sering muncul

### Apakah Raqio merupakan wallet atau exchange?

Fokus utama implementasi ini adalah penguncian dan distribusi aset melalui smart contract. Pengguna memakai wallet untuk menandatangani transaksi. Fungsi tersebut berbeda dari layanan wallet umum maupun tempat memperdagangkan token.

### Apakah saya langsung mendapatkan token ketika waktunya tiba?

Pada stream, hak yang vested dihitung mengikuti waktu. Pemindahan token ke wallet dilakukan melalui transaksi klaim. Pada time lock, beneficiary juga melakukan klaim setelah ketentuan waktu terpenuhi.

### Apakah stream yang memakai cliff melepaskan token sedikit demi sedikit sejak cliff saja?

Dalam kontrak yang diperiksa, sebelum cliff nilai vested adalah nol. Saat cliff tercapai, akrual dihitung dari waktu mulai stream. Setelah itu, hak bertambah secara linear sampai akhir.

### Apakah pembuat dapat menarik kembali seluruh dana kapan pun?

Hak tersebut bergantung pada tipe lock dan pengaturan awal. Pada stream cancelable, pembatalan mengembalikan bagian belum vested kepada owner saat itu, sedangkan bagian vested yang belum diklaim dibayarkan kepada beneficiary. Stream non-cancelable tidak menyediakan pembatalan itu.

### Apakah ownership lock dapat dipindahkan ke wallet lain?

Ya, sesuai ketentuan kontrak. Perubahan owner memindahkan hak pengelolaan yang diizinkan, tetapi tidak mengganti beneficiary yang berhak menerima pembayaran.

### Apakah airdrop dengan vesting memiliki satu jadwal mulai yang sama bagi semua penerima?

Dalam implementasi yang diperiksa, setiap klaim airdrop membuat stream dengan start pada waktu klaim tersebut. Durasi kampanye dapat sama, tetapi tanggal mulai dan selesai masing-masing stream mengikuti waktu pembuatannya.

### Apakah pengguna harus membeli token RAQIO untuk memakai Vault?

Implementasi Vault yang diperiksa tidak mensyaratkan staking atau kepemilikan token RAQIO. Pengguna membutuhkan aset yang kompatibel, izin penggunaan aset yang sesuai, serta gas jaringan. Dokumen tokenomics merupakan proposal terpisah.

### Apakah skor tinggi menjamin token aman?

Tidak. RaqioScore merangkum sebagian fakta komitmen di Vault. Keamanan token, nilai pasar, identitas pihak terkait, dan aktivitas di luar cakupannya memerlukan pemeriksaan tersendiri.

### Apakah menyimpan NFT posisi likuiditas membuktikan pool tersebut autentik?

Tidak. Custody ERC-721 generik menunjukkan penyimpanan NFT yang dimasukkan ke kontrak. Validasi identitas pool dan fitur khusus posisi DEX merupakan kemampuan terpisah.

### Apakah semua token bisa digunakan?

Tidak. Deposit dengan pajak transfer ditolak dan token rebasing tidak didukung. Pembatasan pada token tertentu dapat memengaruhi transfer dan klaim, sehingga kompatibilitas perlu diperiksa.

## Penutup: memberi bentuk yang dapat diperiksa pada komitmen token

Raqio berangkat dari kebutuhan yang konkret: sebuah alokasi token perlu diikuti kejelasan tentang dana, waktu, penerima, serta hak yang melekat pada distribusinya.

Vault menghubungkan aset yang disetorkan dengan aturan penguncian atau vesting. Airdrop menambahkan mekanisme distribusi berdasarkan bukti alokasi. Score membantu membaca sebagian catatan komitmen dengan batas perhitungan yang dinyatakan.

Bagi pembuat, mekanisme ini menyediakan cara untuk menempatkan alokasi ke dalam struktur pelaksanaan yang dapat dirujuk. Bagi penerima, struktur tersebut menyediakan dasar untuk memahami apa yang tersedia, kapan bisa diklaim, dan kondisi apa yang dapat memengaruhinya.

Nilai sebuah jadwal terletak pada ketentuannya yang dapat dipahami dan pelaksanaannya yang dapat diperiksa. Itulah gagasan yang ingin diwujudkan Raqio melalui token lock, vesting, dan distribusi yang didanai.

**Raqio. Value, released in time.**

---

## Catatan sumber dan verifikasi editorial

Artikel disusun pada **11 November 2026** berdasarkan source repository pada commit `4cfff76ccf9ce98783c50c5e686388796dad4fba`, dokumen produk, antarmuka, dan kode kontrak. Contoh angka merupakan ilustrasi, bukan statistik penggunaan atau janji hasil ekonomi.

Sumber primer yang digunakan:

1. [Whitepaper teknis Raqio](../whitepaper.md).
2. [Status implementasi platform](../platform-implementation-status.md).
3. [Catatan pemeriksaan kesiapan mainnet](../mainnet-readiness-audit.md).
4. [Source RaqioVault](../../contracts/src/RaqioVault.sol).
5. [Source RaqioAirdrop](../../contracts/src/RaqioAirdrop.sol).
6. [Source RaqioScore](../../contracts/src/RaqioScore.sol).
7. [Catatan alamat dan deployment](../../contracts/deployments/elysium-mainnet-99901.json).
8. [Dokumen tokenomics dengan status proposal](../tokenomics.md).
9. [Implementasi form Vault](../../src/components/app/VaultForm.tsx) dan [form Airdrop](../../src/components/app/AirdropDesk.tsx).

Pemeriksaan baca langsung melalui RPC yang tercantum pada deployment dilakukan pada **11 November 2026 pukul 18.05 WIB**. Chain ID yang dikembalikan adalah `99901`; blok yang dibaca bernomor `4695475`. Ketiga alamat mengembalikan bytecode. Fee Vault terbaca `25` bps, batas fee `50` bps, dan jeda perubahan fee `172800` detik. Airdrop serta Score menunjuk ke Vault yang tercantum dalam catatan deployment.

Verifikasi ini tidak mengirim transaksi atau memindahkan aset. Cakupannya adalah pembacaan parameter tersebut dan pencocokan artikel terhadap source, bukan audit independen atau pembuktian keselamatan semua perilaku kontrak. Nilai yang dapat berubah, termasuk fee, perlu dibaca kembali saat artikel digunakan untuk publikasi atau sebelum membuat transaksi.
