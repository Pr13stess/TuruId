# Foto profil Owner

Profil → Ubah profil → Ubah foto profil → pilih dari galeri → pratinjau → Simpan foto/Batal. Picker yang sudah ada menormalisasi dan mengompresi foto menjadi JPEG. Adapter memeriksa signature JPEG dan ukuran maksimal 5 MB sebelum upload. Form identitas tetap terpasang selama profil dimuat ulang setelah menyimpan foto, sehingga isian yang belum disimpan tetap terjaga.

Menggunakan bucket `avatars` dan `profiles.avatar_path`, sama dengan adapter User yang sudah ada. Setiap upload memakai `{user_id}/{uuid}.jpg` dan `upsert:false`. Tidak menghapus, mengganti nama, atau menimpa objek lama. Tidak mengubah owner-upload, policy, migrasi, dependensi, auth, atau status verifikasi. Foto ditampilkan melalui public URL mengikuti konvensi avatar User; jika foto gagal dimuat tampil inisial.

Belum mengakses backend DEV pada pekerjaan ini. Jalur ini memerlukan bucket avatars publik serta izin INSERT objek milik sendiri dan UPDATE avatar_path profil sendiri yang digunakan User App. Konfigurasi tersebut tidak lengkap dalam migrasi root lokal; keberhasilan upload/simpan/read di DEV harus diuji, tidak disimpulkan dari UI atau tes SDK mock. Jika izin belum tersedia, perlu proposal SQL terpisah dan persetujuan sebelum apply.

Foto ini milik akun bersama User/Owner. Bila login dengan akun yang sama, avatar User ikut membaca path baru setelah profil dimuat ulang. Ini belum dibuktikan lintas aplikasi di DEV.

Jika upload berhasil tetapi update profil gagal, objek baru tetap disimpan tanpa direferensikan. Retry membuat objek baru; tidak ada janji idempotensi avatar. Foto lama tetap menjadi referensi sampai update berhasil. Pembersihan objek tidak dilakukan.

Tes lokal baru: validasi format/ukuran, upload immutable dengan SDK, pembatasan update ke ID pemilik, kegagalan menyimpan tidak dianggap sukses, tidak ada DELETE storage. Tidak menggantikan uji galeri/perizinan Android atau RLS/storage DEV.

Uji manual: pilih dan batal (foto lama tetap), pilih dan simpan, pull-to-refresh profil/restart, koneksi gagal lalu retry, coba foto lain, dan cek akun lain tidak berubah. Rollback dengan git revert commit fitur; tidak menghapus file storage atau mengembalikan data profil otomatis.
