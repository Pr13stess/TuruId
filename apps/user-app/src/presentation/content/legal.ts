export const POLICY_VERSION = "2026-09-28-1";

export interface LegalSection {
  title: string;
  body: string;
}

export const LEGAL: Record<
  "privacy" | "terms",
  { title: string; sections: LegalSection[] }
> = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        title: "Tujuan pemrosesan",
        body: "Aplikasi menggunakan data akun untuk autentikasi, profil untuk komunikasi, lokasi pilihan untuk pencarian kos, serta data booking dan pembayaran untuk mengelola pemesanan. Catatan pribadi digunakan hanya untuk membantu pengguna mencatat pertimbangan kos.",
      },
      {
        title: "Data yang diproses",
        body: "Data dapat meliputi nama, email, nomor HP, foto profil, lokasi yang dipilih atau diizinkan, chat dan gambar, catatan pribadi, favorit, metadata panggilan, booking, transaksi pembayaran, laporan, dan bukti verifikasi.",
      },
      {
        title: "Akses dan layanan pendukung",
        body: "Owner menerima data yang diperlukan untuk percakapan dan booking terkait. Catatan hanya tersedia bagi pembuat melalui aplikasi. Supabase memproses penyimpanan dan autentikasi, Agora memproses media panggilan, Penyedia pembayaran memproses transaksi, dan layanan notifikasi mengirim pemberitahuan. Audio dan video panggilan tidak direkam oleh fitur aplikasi.",
      },
      {
        title: "Izin perangkat",
        body: "Lokasi, kamera, mikrofon, galeri, dan notifikasi diminta sesuai kebutuhan fitur. Kamu dapat menolak atau mencabut izin melalui pengaturan perangkat. Pencarian manual tetap tersedia ketika lokasi ditolak.",
      },
      {
        title: "Kontrol data",
        body: "Kamu dapat mengubah profil, menghapus catatan dan favorit, mengatur notifikasi, serta mengajukan hapus akun. Riwayat transaksi atau kasus yang belum selesai ditangani sebelum identitas akun dilepas.",
      },
    ],
  },
  terms: {
    title: "Terms and Conditions",
    sections: [
      {
        title: "Penggunaan layanan",
        body: "Pengguna harus menjaga kredensial, memberikan informasi yang sesuai, dan tidak menggunakan layanan untuk spam, penipuan, atau perilaku mengganggu.",
      },
      {
        title: "Booking dan biaya",
        body: "Pengguna memilih tipe kamar dan paket, membaca DP serta security deposit, lalu mengikuti masa berlaku hold. Konfirmasi booking bergantung pada ketersediaan dan hasil pembayaran yang diverifikasi backend.",
      },
      {
        title: "Pembayaran dan verifikasi",
        body: "Badge verifikasi menunjukkan pemeriksaan administratif. Pengelola dapat meninjau laporan dan membatasi akun atau listing dengan alasan yang dicatat.",
      },
    ],
  },
};

export const FAQ: LegalSection[] = [
  {
    title: "Bagaimana cara mencari kos dekat kampus?",
    body: "Di Home, pilih lokasi acuan (misalnya kampus), lalu urutkan berdasarkan Terdekat. Jarak yang tampil adalah jarak garis lurus, bukan jarak rute.",
  },
  {
    title: "Bagaimana memeriksa status pembayaran?",
    body: "Buka detail booking atau Riwayat pembayaran untuk melihat status transaksi.",
  },
  {
    title: "Apa arti badge terverifikasi?",
    body: "Badge menunjukkan pemeriksaan administratif, bukan jaminan kualitas kos.",
  },
  {
    title: "Kenapa harga di kartu berbeda dengan harga di detail?",
    body: "Kartu menampilkan harga mulai dari untuk periode sewa yang sedang kamu filter. Harga tiap tipe kamar dan paket ada di halaman detail.",
  },
  {
    title: "Bagaimana mengubah data akun?",
    body: "Buka Profil, lalu pilih Ubah profil atau Ubah password.",
  },
];

export const ABOUT_TEXT =
  "Turu.Id membantu kamu mencari kos, membandingkan fasilitas, menghubungi pemilik, dan mengelola booking.";
