export default {

    formatWhatsappID: (telCel) => {
    // Limpiamos cualquier carácter no numérico y aseguramos que sea una cadena
    const telStr = String(telCel).replace(/\D/g, ''); 

    // 1. Validar longitud (estrictamente 11 o 12 dígitos)
    if (!telStr || (telStr.length !== 11 && telStr.length !== 12)) {
        showAlert('Error: El Teléfono Celular debe ser 11 o 12 dígitos.', 'error');
        return null;
    }

    let countryCode;
    let localNumber;
    
    // Lógica para determinar la división:
    if (telStr.length === 12) {
        // Estándar de 12 dígitos: 2 (país) + 10 (local)
        countryCode = telStr.substring(0, 2); 
        localNumber = telStr.substring(2);     
    } else { // Longitud es 11
        // Asumimos 11 dígitos: 1 (país) + 10 (local)
        countryCode = telStr.substring(0, 1);  
        localNumber = telStr.substring(1);      
    }
    
    // 2. Construcción del cliente_wa: (Código País) & ("1") & (Número Local) & ("@s.whatsapp.net")
    // El '1' se concatena después del código de país para cumplir el formato requerido.
    const waIDPrefix = countryCode + "1" + localNumber;
    const waID = waIDPrefix + "@s.whatsapp.net";

    return waID;
}, // <-- COMA

   cargarClienteParaEdicion: (fila) => {
    // Si le pasamos 'fila' (desde el botón), usa esa. Si no, busca la seleccionada.
    const row = fila || tblClientes.selectedRow;
    
    if (!row) return; // Protección contra errores
    // Asignación de valores (Igual que antes)
    inpNombreCliente.setValue(row.nombre);
    inpContactoCliente.setValue(row.contacto); 
    inpTelCelCliente.setValue(row.tel_cel); 
    inpDireccionCliente.setValue(row.direccion); 
    inpEmailCliente.setValue(row.email); 
		inpPorcentajeCosto.setValue(row.porcentaje_sobre_costo);
    
    // Almacena el ID para indicar modo EDICIÓN
    storeValue('currentClienteId', row.id); 
}, // <-- COMA

    guardarCliente: async () => {
    const telCelValue = inpTelCelCliente.text;
    // CORRECCIÓN 1: La función formatWhatsappID no es asíncrona, quitamos 'await'.
    const formattedWAID = this.formatWhatsappID(telCelValue); 

    if (!formattedWAID) { return; } 
    
    // Guardamos el ID de WA calculado en la tienda
    await storeValue('temp_cliente_wa', formattedWAID);

    try {
        // Obtenemos el ID del cliente a editar (será null si es CREATE)
        const clienteIdToEdit = appsmith.store.currentClienteId;

        // CORRECCIÓN 2: Verificamos si existe un ID NUMÉRICO para editar.
        if (clienteIdToEdit && !isNaN(clienteIdToEdit)) { 
            // Modo EDICIÓN: El ID existe y es un número válido
            await updateCliente.run({
                 // Pasamos el ID del cliente al WHERE del UPDATE (ver Paso 2)
                 clienteId: clienteIdToEdit 
            });
            showAlert('Cliente actualizado con éxito.', 'success');
        } else {
            // Modo CREACIÓN
            await insertCliente.run();
            showAlert('Cliente registrado con éxito.', 'success');
        }
    } catch (e) {
        // En caso de error, siempre limpiamos la tienda para no confundir el siguiente intento
        await storeValue('temp_cliente_wa', null); 
        showAlert('Error al guardar: ' + e.message, 'error');
        return;
    }

    // Limpieza y Refresco final
    await this.limpiarFormulario();
    await getClientes.run();
}, // <-- COMA
    limpiarFormulario: async () => {
        // Asumiendo que el formulario tiene un contenedor (ej. FormClientes) o reseteamos cada widget
        await resetWidget('inpNombreCliente', true);
        await resetWidget('inpContactoCliente', true);
        await resetWidget('inpTelCelCliente', true);
        await resetWidget('inpDireccionCliente', true);
        await resetWidget('inpEmailCliente', true);
			  await resetWidget("inpPorcentajeCosto", true);
        
        // Limpia el estado de edición
        await storeValue('currentClienteId', null);
    } // <-- NO LLEVA COMA
}