export default {
	// ----------------------
	// Funciones Auxiliares (Tus funciones existentes)
	// ----------------------
	formatearFecha: (fechaIso) => {
		if (!fechaIso) {
			return 'N/A';
		}
		try {
			// Asume que moment.js está disponible
			return moment(fechaIso).format('DD/MM/YYYY HH:mm');
		} catch (e) {
			console.error("Error formateando fecha:", e);
			// Fallback a formato nativo si moment falla o no está
			try {
				return new Date(fechaIso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
			} catch (e2) {
				return 'Fecha inválida';
			}
		}
	},
	construirUrlStorage: (path) => {
		if (!path) {
			return '';
		}
		// Confirma que esta URL base sea correcta
		const baseUrl = 'https://supabaseondarza.miareacontable.com/storage/v1/object/public/pedidos/';
		return baseUrl + path;
	},
	obtenerNombreColaborador: (id, colaboradoresData = getColaboradores.data) => { // Añadido valor por defecto
		if (!id || !colaboradoresData || !Array.isArray(colaboradoresData)) return 'No asignado';
		const colaborador = colaboradoresData.find(col => col.id === id);
		return colaborador ? colaborador.nombre : 'ID: ' + id;
	},
	obtenerNombreSubdepto: (id, subdeptosData = getSubdepartamentos.data) => { // Añadido valor por defecto
		if (!id || !subdeptosData || !Array.isArray(subdeptosData)) return 'N/A';
		const subdepto = subdeptosData.find(sub => sub.id === id);
		return subdepto ? subdepto.nombre_subdepartamento : 'ID: ' + id;
	},
	obtenerNombreCliente: (id, clientesData = getClientes.data) => { // Añadido valor por defecto
		if (!id || !clientesData || !Array.isArray(clientesData)) return 'Cliente Desconocido';
		const cliente = clientesData.find(cli => cli.id === id);
		if (cliente) return cliente.nombre || cliente.empresa || cliente.cliente_wa || ('ID Cliente: ' + id);
		return 'Cliente Desconocido';
	},
	getColorForEstado: (estadoInterno) => {
		if (!estadoInterno) return '#6B7280'; // Gris por defecto
		switch (estadoInterno.toLowerCase()) {
			case 'pendiente_cotizacion': return '#F59E0B'; // Ámbar
			case 'cotizacion_enviada': return '#3B82F6'; // Azul
			case 'pedido_confirmado': return '#10B981'; // Esmeralda
			case 'en_produccion': return '#8B5CF6'; // Violeta
			case 'listo_para_entrega': return '#0EA5E9'; // Azul cielo
			case 'entregado': return '#22C55E'; // Verde
			case 'cancelado': return '#EF4444'; // Rojo
			default: return '#6B7280'; // Gris
		}
	},

	// ----------------------
	// Funciones del Workflow (Actualizadas)
	// ----------------------

	loadCurrentProductList: (selectedPedidoId) => {
		storeValue('currentPedidoId', selectedPedidoId);
		console.log("ID guardado en store:", appsmith.store.currentPedidoId);

		return getPedidoDetalle.run()
			.then(() => {
				console.log("Datos de getPedidoDetalle:", getPedidoDetalle.data);
				if (getPedidoDetalle.data && getPedidoDetalle.data.length > 0) {
					try {
						let productList = getPedidoDetalle.data[0]?.lista_solicitud;
						if (typeof productList === 'string') {
							storeValue('currentProductList', JSON.parse(productList || '[]'));
						} else {
							storeValue('currentProductList', productList || []);
						}
					} catch (e) {
						console.error("Error parsing lista_solicitud:", e);
						storeValue('currentProductList', []);
					}
					console.log("Lista productos en store:", appsmith.store.currentProductList);
				} else {
					storeValue('currentProductList', []);
				}
			// --- INICIO: LÍNEA AÑADIDA ---
            resetWidget('selEstadoLote', true); // Resetea el dropdown a su estado inicial (placeholder)
            // --- FIN: LÍNEA AÑADIDA ---
			
				showModal('modDetallePedidoColaborador');
			})
			.catch((error) => {
				console.error("Error al ejecutar getPedidoDetalle:", error);
				showAlert('Error al cargar los detalles del pedido.', 'error');
				storeValue('currentProductList', []);
				showModal('modDetallePedidoColaborador');
			});
	},

	toggleMisTareasFilter: async () => {
		// Asume que tienes una forma de obtener el ID del colaborador actual, por ejemplo, de appsmith.user o una query
		// const currentUserId = tu_query_colaborador_actual.data?.id; 
		const currentUserId = 1; // EJEMPLO: Reemplaza con la forma real de obtener el ID
		
		if (!currentUserId) {
			showAlert('Error: ID de usuario no definido para filtrar tareas.', 'error');
			return;
		}
		const filtroActivo = appsmith.store.filtroMisTareasActivo === true;
		await storeValue('filtroMisTareasActivo', !filtroActivo);
		// Asegúrate que getPedidosColaborador use appsmith.store.filtroMisTareasActivo y currentUserId en su WHERE
		await getPedidosColaborador.run();
	},

	// --- INICIO: Función Actualizada ---
	// Función SOLO para añadir producto (llamada desde modAddProducto)
	addProductToList: () => {
		const currentList = appsmith.store.currentProductList || [];
		let modifiedList = [...currentList];

		// Lee valores (¡ASEGÚRATE QUE LOS NOMBRES SEAN CORRECTOS!)
		const productoText = inpProductoAdd.text;         // Input Producto
		const cantidadText = inpCantidadAdd.text;         // Input Cantidad
		const priceValue = inpPrecioVentaAdd.text;      // Input Precio
		const tipoUnidadText = inpTipoUnidadAdd.text;     // Input Tipo Unidad
		const estadoItemValue = selEstadoItemAdd.selectedOptionValue; // Dropdown Estado Ítem
		const comentariosItemText = inpComentariosItemAdd.text; // Input Comentarios Ítem

		// Validaciones básicas
		if (!productoText || !cantidadText) {
			showAlert('Producto y Cantidad son requeridos.', 'warning');
			return;
		}

		const newProductData = {
			producto: productoText,
			cantidad: String(cantidadText || '1'), // Asegura string
			precio_venta: (priceValue === null || priceValue === "" || priceValue === undefined || isNaN(parseFloat(priceValue)))
										? null 
										: parseFloat(priceValue), // Convierte a número si es válido
			tipo_unidad: tipoUnidadText || "",             // Nuevo
			estado_item: estadoItemValue || null,           // Nuevo
			comentarios_item: comentariosItemText || ""     // Nuevo
		};

		modifiedList.push(newProductData); // Añade el nuevo objeto

		storeValue('currentProductList', modifiedList); // Guarda la lista actualizada
		closeModal('modAddProducto'); // Cierra el modal de añadir
		// (Opcional) Resetea los campos del modal de añadir si es necesario
		// resetWidget('inpProductoAdd', true); 
		// resetWidget('inpCantidadAdd', true);
		// ... etc.
	},
	// --- FIN: Función Actualizada ---


	// --- INICIO: Función Actualizada ---
	// Función para guardar cambios desde modEditProducto
	upsertProducto: () => {
		const index = appsmith.store.editIndex;
		console.log("Intentando editar índice:", index);

		// Validación robusta del índice
		if (index === undefined || index === null || index < 0) {
			console.error("Índice inválido o no definido:", index);
			showAlert('Error: No se pudo determinar qué producto editar.', 'error');
			return;
		}

		const currentList = appsmith.store.currentProductList || [];
		// Verifica si el índice es válido para la lista actual
		if (index >= currentList.length) {
			console.error("Índice fuera de rango:", index, "Tamaño lista:", currentList.length);
			showAlert('Error: Índice de producto fuera de rango.', 'error');
			return;
		}

		let modifiedList = [...currentList]; // Copia la lista actual

		// Lee valores de los inputs de edición (¡ASEGÚRATE QUE LOS NOMBRES SEAN CORRECTOS!)
		const productoText = inpProductoEdit.text;         // Input Producto
		const cantidadText = inpCantidadEdit.text;         // Input Cantidad
		const priceValue = inpPrecioVentaEdit.text;      // Input Precio
		const tipoUnidadText = inpTipoUnidadEdit.text;     // Input Tipo Unidad
		const estadoItemValue = selEstadoItemEdit.selectedOptionValue; // Dropdown Estado Ítem
		const comentariosItemText = inpComentariosItemEdit.text; // Input Comentarios Ítem


		// Validaciones básicas
		if (!productoText || !cantidadText) {
			showAlert('Producto y Cantidad son requeridos.', 'warning');
			return;
		}
		
		// Crea el objeto actualizado
		const updatedProduct = {
			...modifiedList[index], // Mantiene otros campos si existieran y no se editan aquí
			producto: productoText,
			cantidad: String(cantidadText || '1'), // Asegura string
			precio_venta: (priceValue === null || priceValue === "" || priceValue === undefined || isNaN(parseFloat(priceValue)))
										? null 
										: parseFloat(priceValue), // Convierte a número si es válido
			tipo_unidad: tipoUnidadText || "",             // Nuevo/Actualizado
			estado_item: estadoItemValue || null,           // Nuevo/Actualizado
			comentarios_item: comentariosItemText || ""     // Nuevo/Actualizado
		};

		// Actualiza el elemento en la lista copiada
		modifiedList[index] = updatedProduct;

		// Guarda la lista modificada en el store
		storeValue('currentProductList', modifiedList);

		// Limpia stores temporales
		storeValue('editRowData', undefined);
		storeValue('editIndex', undefined); // Limpia completamente

		// Cierra el modal de edición
		closeModal('modEditProducto');
	},
  // --- FIN: Función Actualizada ---

	eliminarProducto: () => {
		const selectedIndex = tblProductos.selectedRowIndex;
		if (selectedIndex === null || selectedIndex < 0) {
			showAlert('Por favor, selecciona un producto para eliminar.', 'warning');
			return;
		}
		const currentList = appsmith.store.currentProductList || [];
		let modifiedList = [...currentList];
		modifiedList.splice(selectedIndex, 1); // Elimina el elemento en el índice seleccionado
		storeValue('currentProductList', modifiedList);
		showAlert('Producto eliminado de la lista temporal.', 'success');
	},

	// Función para preparar la edición desde el botón del lápiz
	prepareToEditProduct: (rowData) => {
		const currentList = appsmith.store.currentProductList || [];
		// Intenta encontrar por una combinación única si es posible, o usa el índice de la tabla si es fiable
		// Usar findIndex puede ser más seguro si la tabla permite reordenar
		const index = currentList.findIndex(item => 
			// Ajusta esta condición si es necesario para identificar unívocamente la fila
			item.producto === rowData.producto && String(item.cantidad) === String(rowData.cantidad) 
		); 

		if (index !== -1) {
			storeValue('editRowData', currentList[index]); // Guarda el objeto COMPLETO encontrado
			storeValue('editIndex', index);
			console.log("prepareToEditProduct: Guardando índice:", index, "Datos:", currentList[index]);
			showModal('modEditProducto'); // Abre el modal de edición
		} else {
			console.error("prepareToEditProduct: No se encontró el producto en la lista:", rowData);
			showAlert('Error: No se encontró el producto seleccionado en la lista temporal.', 'error');
			storeValue('editRowData', undefined);
			storeValue('editIndex', undefined);
		}
	},

calcularNuevoEstadoId: () => {
    // Asegúrate de tener una query que traiga los estados (ej. getEstadosOrdenados)
    // y que ya se haya ejecutado (puedes añadir getEstadosOrdenados.run() al inicio si es necesario)
    const productList = appsmith.store.currentProductList || [];
    const estadosData = getEstadosOrdenados.data || []; // Usa el nombre de tu query de estados

    // Si no hay productos o datos de estados, devuelve el estado actual del pedido para no cambiarlo
    if (productList.length === 0 || estadosData.length === 0) {
        return getPedidoDetalle.data[0]?.estado_id || 1; // Devuelve ID actual o 1 por defecto
    }

    // 1. Contar cuántas veces aparece cada 'estado_item' válido
    const counts = productList.reduce((acc, item) => {
        // Solo cuenta si el estado_item existe y no está vacío
        if (item.estado_item && String(item.estado_item).trim() !== "") {
            acc[item.estado_item] = (acc[item.estado_item] || 0) + 1;
        }
        return acc;
    }, {});

    const estadosEnLista = Object.keys(counts);

    // Si no hay ningún estado_item válido en la lista, devuelve el estado actual
    if (estadosEnLista.length === 0) {
       return getPedidoDetalle.data[0]?.estado_id || 1;
    }

    // 2. Encontrar cuál es la frecuencia más alta
    let maxCount = 0;
    estadosEnLista.forEach(estado => {
        if (counts[estado] > maxCount) {
            maxCount = counts[estado];
        }
    });

    // 3. Filtrar para obtener todos los estados que tienen esa frecuencia máxima (puede haber empates)
    const mostFrequentStates = estadosEnLista.filter(estado => counts[estado] === maxCount);

    let winningEstadoInterno;

    if (mostFrequentStates.length === 1) {
        // 4a. Si solo hay un estado más frecuente, ese es el ganador
        winningEstadoInterno = mostFrequentStates[0];
    } else {
        // 4b. Si hay empate, busca entre los empatados cuál tiene el mayor 'orden_visual'
        let highestOrder = -1; // Empezamos con un orden bajo
        mostFrequentStates.forEach(estadoInterno => {
            // Busca la información de este estado en los datos de maestro_estados
            const estadoInfo = estadosData.find(e => e.estado_interno === estadoInterno);
            // Si encontramos el estado y su orden es mayor al que teníamos guardado...
            if (estadoInfo && estadoInfo.orden_visual > highestOrder) {
                highestOrder = estadoInfo.orden_visual; // Actualizamos el orden más alto
                winningEstadoInterno = estadoInterno;  // Este es el nuevo ganador temporal
            }
        });
        // Si por alguna razón no encontramos un ganador (datos inconsistentes), nos quedamos con el primero del empate
         if (!winningEstadoInterno && mostFrequentStates.length > 0) {
             winningEstadoInterno = mostFrequentStates[0];
         }
    }

     // Si aún no hay ganador (caso extremo), devuelve estado actual
     if (!winningEstadoInterno) {
          return getPedidoDetalle.data[0]?.estado_id || 1;
     }

    // 5. Busca el registro completo del estado ganador en maestro_estados para obtener su ID
    const finalEstado = estadosData.find(e => e.estado_interno === winningEstadoInterno);

    // 6. Devuelve el ID del estado ganador. Si no se encontró (raro), devuelve el ID actual del pedido.
    console.log("Estado item más frecuente:", winningEstadoInterno, "ID:", finalEstado ? finalEstado.id : 'No encontrado');
    return finalEstado ? finalEstado.id : (getPedidoDetalle.data[0]?.estado_id || 1);
},

// Nueva función para manejar todo el proceso de guardado y refresco
saveProductChangesAndUpdateState: async () => {
    try {
        // 1. Ejecuta y ESPERA a que termine de guardar la lista
        await updateListaProductos.run();
        console.log("Lista de productos guardada.");

        // 2. Si la lista se guardó bien, calcula el nuevo estado
        const nuevoEstadoId = utils.calcularNuevoEstadoId();
        console.log("Nuevo estado ID calculado:", nuevoEstadoId);

        try {
            // 3. Ejecuta y ESPERA a que termine de guardar el estado general
            await updateEstadoPedidoGeneral.run({ newEstadoId: nuevoEstadoId });
            console.log("Estado general guardado.");

            // 4. Si el estado se guardó bien, AHORA refresca los datos (esperando a cada uno)
            console.log("Refrescando getPedidoDetalle...");
            await getPedidoDetalle.run();
            console.log("Refrescando getPedidosColaborador...");
            await getPedidosColaborador.run();
            
            // --- INICIO: LÓGICA AÑADIDA PARA GRÁFICOS ---
            console.log("Refrescando getPedidosParaCharts...");
            await getPedidosParaCharts.run(); // Ejecuta la consulta de datos de gráficos
            
            // Fuerza el reseteo de la selección de los gráficos para que se repinten con los nuevos datos
            // Esto es crucial para que los gráficos reflejen el nuevo estado.
            await resetWidget("chartAtrasados", true);
            await resetWidget("chartEnTiempo", true);
            await resetWidget("chartAmbos", true);
            // --- FIN: LÓGICA AÑADIDA PARA GRÁFICOS ---

            showAlert('¡Lista y estado guardados correctamente!', 'success');

        } catch (estadoError) {
            // 5. Manejo de error si falla guardar el estado general
            console.error("Error al guardar estado general:", estadoError);
            showAlert('Error al guardar el estado general del pedido.', 'error');
        }

    } catch (listaError) {
        // 6. Manejo de error si falla guardar la lista inicial
        console.error("Error al guardar lista productos:", listaError);
        showAlert('Error al guardar la lista de productos.', 'error');
    }
},
updateEstadoItemsLote: () => {
    // Obtiene el estado seleccionado en el nuevo dropdown
    const nuevoEstado = selEstadoLote.selectedOptionValue;

    // Verifica si se seleccionó un estado válido
    if (!nuevoEstado || nuevoEstado === "") {
        // Opcional: Mostrar alerta si no se seleccionó nada
        // showAlert('Por favor, selecciona un estado para actualizar en lote.', 'warning');
        return; // No hace nada si no hay estado seleccionado
    }

    // Obtiene la lista actual de productos del store
    const currentList = appsmith.store.currentProductList || [];

    // Crea una nueva lista modificada
    // Mapea sobre cada producto y actualiza solo el estado_item
    const modifiedList = currentList.map(item => {
        return {
            ...item, // Copia todas las propiedades existentes del producto
            estado_item: nuevoEstado // Actualiza/sobrescribe solo el estado_item
        };
    });

    // Guarda la lista completamente modificada de vuelta en el store
    storeValue('currentProductList', modifiedList);

    // Opcional: Resetea el dropdown de lote para futuras selecciones
    // resetWidget('selEstadoLote', true); 

    // Opcional: Muestra una confirmación
    showAlert(`Todos los ítems actualizados a estado: ${nuevoEstado}`, 'success');
},
	
    showComment: async (row) => {
        // 1. Espera a que el valor se guarde primero
        await storeValue('currentComment', row);
        
        // 2. Una vez guardado, abre el modal
        showModal('modVerComentario');
    },

// MODIFICAR FIRMA: La función ahora acepta estado y fecha
getEstadoIndicador: (estadoInterno, fechaPlazoStr) => { 
    // 1. Lógica para determinar el orden (necesitas obtener el orden_visual)
    const estados = getEstadosOrdenados.data;
    const estadoActual = estados.find(e => e.estado_interno === estadoInterno);
    const orden = estadoActual ? estadoActual.orden_visual : -1;

    // 2. Lógica de Plazo (similar a la original)
    if (orden > 9) return { text: "Entregado", color: "GREEN" };
    if (orden === 0) return { text: "Cancelado", color: "#6B7280" };

    const fechaPlazo = moment(fechaPlazoStr);
    const fechaActual = moment(); 

    if (fechaPlazo.isBefore(fechaActual)) {
        return { text: "Retrasado", color: "#b91c1c" };
    }

    return { text: "En Tiempo", color: "#553DE9" }; // Usando "En Tiempo"
},
	
resetFiltroMisTareas: async () => {
    // Asegura que el filtro de asignación esté APAGADO al cargar la página
    await storeValue('filtroMisTareasActivo', false);
},

onPageLoadLogic: async () => {
    // 1. Limpieza forzada del filtro fantasma (clave para ver todos los registros)
    await storeValue('filtroMisTareasActivo', false); 

    // 2. Ejecuta las consultas de datos maestros (deben estar con "Run on Page Load" en OFF)
    // Ejecutar getColaboradores es vital, ya que contiene el On Success que dispara otros flujos en el JSON original
    await getColaboradores.run(); 
    await getClientes_filtro.run();
    await getEstadosOrdenados.run();
    await getSubdepartamentos.run();

    // 3. Ejecuta la consulta principal de pedidos (debe estar con "Run on Page Load" en OFF)
    await getPedidosColaborador.run();
}
}