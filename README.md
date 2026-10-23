# Kurasi

**Atelier lemarimu, satu ensemble setiap pagi.**

Kurasi membantu perempuan berhijab memadukan baju, bawahan, gamis, hijab, outer, sepatu, dan tas dari isi lemari sendiri, sesuai acara, tema/dresscode, dan personal color.

Final Project Mini Bootcamp Claude for Non-Tech Professional (MBCL Cohort 3), Kelompok 4, Adhesty.

## Fitur
1. **Lemari digital**: tambah item lewat palet 21 warna, tandai bermotif dan cocok untuk acara apa.
2. **Kunci 1 item**: pilih satu item (misalnya atasan wine), Kurasi memberi 1 outfit terbaik + tombol "Ganti outfit".
3. **Tema & look**: 6 tema siap pakai, masing-masing 3 look; tema lain dibuat AI (Cloudflare Workers AI).
4. **Personal color**: kuis 4 pertanyaan atau pilih sendiri; hijab yang cocok diberi tanda "Cocok untukmu".
5. **Riwayat**: item yang dipakai beristirahat 7 hari.

## Teknis
- `index.html`: seluruh app dalam satu halaman. Data tersimpan di browser (localStorage), tanpa login.
- `worker.js`: Cloudflare Worker untuk fitur AI, memakai model `@cf/google/gemma-4-26b-a4b-it` di paket gratis Workers AI.
- AI dipanggil sekali per tema baru; hasil look disimpan di perangkat pengguna.

Dibangun bersama Claude tanpa menulis kode manual.
