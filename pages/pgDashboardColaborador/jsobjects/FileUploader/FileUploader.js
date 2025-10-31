export default {

  async subirArchivo() {
    // --- PASO 1: Validar que hay un archivo ---
    if (!fpDocInterno.files || fpDocInterno.files.length === 0) {
      showAlert("Por favor selecciona un archivo", "error");
      return;
    }

    // --- PASO 2: Validar que hay un pedido seleccionado ---
    if (!appsmith.store.currentPedidoId) {
      showAlert("No hay pedido seleccionado", "error");
      return;
    }

    const file = fpDocInterno.files[0];

    // --- PASO 3: Guardar en el store (para que la consulta SQL 'addDocumentoInterno' funcione) ---
    await storeValue('tempFile', {
      name: file.name,
      type: file.type || 'application/octet-stream',
      data: file.data // El string Base64
    });

    // --- PASO 4: Convertir Base64 a Blob (como en tu solución) ---
    const base64Data = file.data.split(',')[1] || file.data;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.type });

    // --- PASO 5: Construir URL y Headers ---
    const fileName = encodeURIComponent(file.name);
    const url = `https://supabaseondarza.miareacontable.com/storage/v1/object/pedidos/documentos_internos/${appsmith.store.currentPedidoId}/${fileName}`;

    // ¡IMPORTANTE! Usa tu CLAVE SECRETA (Service Role Key), NO la clave 'anon'
    const MY_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3MTUwNTA4MDAsCiAgImV4cCI6IDE4NzI4MTcyMDAKfQ.fC3WHsYEwSu_99oycTeDAWopfWGG4Qs5StyeJJMaplc"; 

    try {
      // --- PASO 6: Ejecutar la subida con 'fetch' ---
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': MY_SERVICE_ROLE_KEY,
          'authorization': `Bearer ${MY_SERVICE_ROLE_KEY}`,
          'content-type': file.type
        },
        body: blob
      });

      // --- PASO 7: Manejar el resultado ---
      if (response.ok) {
        // ¡Éxito! Ahora ejecutamos el SQL
        await addDocumentoInterno.run(); // Esta consulta usará los datos del store
        getPedidoDetalle.run();
        showAlert("¡Archivo subido y registrado!", "success");

      } else {
        const error = await response.text();
        showAlert("Error al subir (fetch): " + error, "error");
      }

    } catch (error) {
      showAlert("Error: " + error.message, "error");
    } finally {
      // Limpiar
      resetWidget('fpDocInterno', true);
      storeValue('tempFile', undefined, false);
    }
  }
}