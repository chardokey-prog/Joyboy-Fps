const connection =
  document.getElementById("connection");

const qrContainer =
  document.getElementById("qrContainer");

const qrImage =
  document.getElementById("qrImage");

const uploadForm =
  document.getElementById("uploadForm");

const uploadButton =
  document.getElementById("uploadButton");

const mediaInput =
  document.getElementById("media");

const imagePreview =
  document.getElementById("imagePreview");

const videoPreview =
  document.getElementById("videoPreview");

const previewContainer =
  document.getElementById("previewContainer");

const message =
  document.getElementById("message");

function showMessage(
  text,
  success = false
) {
  message.textContent = text;

  message.classList.add("show");

  message.style.background =
    success
      ? "#dcfce7"
      : "#fee2e2";

  message.style.color =
    success
      ? "#166534"
      : "#991b1b";
}

async function checkStatus() {
  try {
    const response =
      await fetch("/api/status");

    const data =
      await response.json();

    updateConnection(data);

  } catch (error) {
    connection.textContent =
      "Server tidak dapat dihubungi.";

    connection.className =
      "connection disconnected";
  }
}

function updateConnection(data) {
  if (data.connected) {
    connection.textContent =
      "✓ WhatsApp terhubung";

    connection.className =
      "connection connected";

    qrContainer.classList.add(
      "hidden"
    );

    uploadButton.disabled =
      false;

    return;
  }

  uploadButton.disabled = true;

  if (data.state === "qr" && data.qr) {
    connection.textContent =
      "Scan QR untuk menghubungkan WhatsApp";

    connection.className =
      "connection connecting";

    qrContainer.classList.remove(
      "hidden"
    );

    qrImage.src = data.qr;

    return;
  }

  if (data.state === "connecting") {
    connection.textContent =
      "Menghubungkan WhatsApp...";

    connection.className =
      "connection connecting";

    return;
  }

  connection.textContent =
    "WhatsApp belum terhubung";

  connection.className =
    "connection disconnected";
}

mediaInput.addEventListener(
  "change",
  () => {
    const file =
      mediaInput.files[0];

    if (!file) {
      previewContainer.classList.add(
        "hidden"
      );

      return;
    }

    const url =
      URL.createObjectURL(file);

    previewContainer.classList.remove(
      "hidden"
    );

    imagePreview.classList.add(
      "hidden"
    );

    videoPreview.classList.add(
      "hidden"
    );

    if (
      file.type.startsWith("image/")
    ) {
      imagePreview.src = url;

      imagePreview.classList.remove(
        "hidden"
      );
    }

    if (
      file.type.startsWith("video/")
    ) {
      videoPreview.src = url;

      videoPreview.classList.remove(
        "hidden"
      );
    }
  }
);

uploadForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const file =
      mediaInput.files[0];

    if (!file) {
      showMessage(
        "Pilih foto atau video terlebih dahulu."
      );

      return;
    }

    uploadButton.disabled = true;

    uploadButton.textContent =
      "Mengupload...";

    message.classList.remove(
      "show"
    );

    try {
      const formData =
        new FormData(
          uploadForm
        );

      const response =
        await fetch(
          "/api/upload",
          {
            method: "POST",
            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Upload gagal."
        );
      }

      showMessage(
        data.message ||
        "Status berhasil dikirim.",
        true
      );

      uploadForm.reset();

      previewContainer.classList.add(
        "hidden"
      );

      imagePreview.src = "";

      videoPreview.src = "";

    } catch (error) {
      showMessage(
        error.message ||
        "Terjadi kesalahan."
      );

    } finally {
      uploadButton.textContent =
        "Upload ke Status";

      await checkStatus();
    }
  }
);

checkStatus();

setInterval(
  checkStatus,
  3000
);
