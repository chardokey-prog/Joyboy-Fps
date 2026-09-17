// Mengirim Status Teks (Text Status)
await sock.sendMessage(
  'status@broadcast',
  { 
    text: 'Halo, ini adalah status WhatsApp dari Baileys!' 
  },
  { 
    // Daftar JID kontak yang bisa melihat status ini (wajib diisi)
    statusJidList: ['6285189090342@s.whatsapp.net'] 
  }
);

// Mengirim Status Gambar (Image Status)
await sock.sendMessage(
  'status@broadcast',
  { 
    image: { url: './path/to/image.jpg' }, 
    caption: 'Caption foto status di sini' 
  },
  { 
    statusJidList: ['6285189090342@s.whatsapp.net'],
    backgroundColor: '#FF5733', // Opsional untuk latar belakang teks/gambar tertentu
    broadcast: true
  }
);
```

### Poin Penting
* **JID Tujuan**: Selalu gunakan `'status@broadcast'` sebagai target pengiriman.
* **`statusJidList`**: Properti ini wajib ada untuk menentukan siapa saja kontak Anda yang diizinkan melihat pembaruan status tersebut. Anda harus mengumpulkan daftar JID ini secara mandiri.
