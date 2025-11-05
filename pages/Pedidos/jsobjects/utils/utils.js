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

loadCurrentProductList: async (selectedPedidoId) => {
    try {
        // 1. Guardar el ID del pedido
        await storeValue('currentPedidoId', selectedPedidoId);
        
        // 2. AWAIT: Forzar la espera a que la consulta termine
        // Esta es la corrección clave para la condición de carrera.
        const data = await getPedidoDetalle.run(); 

        // 3. Verificar si la consulta falló (si 'data' está vacío)
        if (!data || data.length === 0) {
            showAlert('Error: No se pudieron cargar los detalles del pedido.', 'error');
            return; // Detener si no hay datos
        }

        // 4. Procesar y guardar la lista de productos
        let productList = data[0]?.lista_solicitud;
        if (typeof productList === 'string') {
            await storeValue('currentProductList', JSON.parse(productList || '[]'));
        } else {
            await storeValue('currentProductList', productList || []);
        }

        // 5. Resetear widgets del modal
        await resetWidget('selEstadoLote', true);
        await resetWidget('inpNuevoComentario', true);

        // 6. FINALMENTE: Mostrar el modal (ahora que los datos están listos)
        showModal('modDetallePedidoColaborador');

    } catch (error) {
        console.error("Error al cargar detalles del pedido:", error);
        showAlert('Error al cargar los detalles: ' + error.message, 'error');
    }
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

// JS Object: utils - Función: calcularNuevoEstadoId (NUEVA LÓGICA)
calcularNuevoEstadoId: () => {
    const productList = appsmith.store.currentProductList || [];
    const estadosData = getEstadosOrdenados.data || []; 

    // Si no hay productos o datos de estados, devuelve el estado actual del pedido.
    if (productList.length === 0 || estadosData.length === 0) {
        return getPedidoDetalle.data[0]?.estado_id || 1; 
    }

    // --- 1. Obtener todos los IDs de Estado y sus órdenes visuales ---
    let lowestOrder = Infinity; // Empezamos con un número muy alto
    let winningEstadoInterno = null;
    
    const estadosEnElPedido = new Set();
    
    // Recorrer la lista de productos y coleccionar todos los estados únicos
    productList.forEach(item => {
        if (item.estado_item && String(item.estado_item).trim() !== "") {
            estadosEnElPedido.add(item.estado_item);
        }
    });

    if (estadosEnElPedido.size === 0) {
        return getPedidoDetalle.data[0]?.estado_id || 1;
    }

    // --- 2. Encontrar el Mínimo orden_visual ---
    estadosEnElPedido.forEach(estadoInterno => {
        // Busca la información del estado maestro
        const estadoInfo = estadosData.find(e => e.estado_interno === estadoInterno);
        
        // Compara si este orden es el más bajo encontrado hasta ahora
        if (estadoInfo && estadoInfo.orden_visual < lowestOrder) {
            lowestOrder = estadoInfo.orden_visual;
            winningEstadoInterno = estadoInterno;
        }
    });
    
    // --- 3. Devolver el ID del Estado Ganador ---
    if (!winningEstadoInterno) {
        return getPedidoDetalle.data[0]?.estado_id || 1;
    }

    const finalEstado = estadosData.find(e => e.estado_interno === winningEstadoInterno);

    console.log("Nuevo estado calculado (Menor Orden):", winningEstadoInterno, "ID:", finalEstado ? finalEstado.id : 'No encontrado');
    
    // Retorna el ID numérico
    return finalEstado ? finalEstado.id : (getPedidoDetalle.data[0]?.estado_id || 1);
},

// Nueva función para manejar todo el proceso de guardado y refresco
// JS Object: utils - Función: saveProductChangesAndUpdateState (AJUSTADA)
saveProductChangesAndUpdateState: async () => {
    try {
        // 1. Guardar la lista de productos (debe ser la primera acción SÍNCRONA)
        await updateListaProductos.run();
        console.log("Lista de productos guardada.");

        // 2. Calcular el nuevo estado (debe ocurrir ANTES de actualizar el estado)
        const nuevoEstadoId = utils.calcularNuevoEstadoId();
        console.log("Nuevo estado ID calculado:", nuevoEstadoId);

        // 3. Ejecutar la actualización del estado general (updateEstadoPedidoGeneral)
        // La promesa debe resolverse sin error.
        await updateEstadoPedidoGeneral.run({ newEstadoId: nuevoEstadoId });
        console.log("Estado general guardado.");

        // --- 4. SECUENCIA CRÍTICA DE REFRESCO PARA SINCRONIZACIÓN ---

        // A. Refrescar todas las fuentes de datos (CRÍTICO)
        await getPedidoDetalle.run();
        await getPedidosColaborador.run();
        
        // Ejecución doble para romper caché de chartAtrasados / chartEnTiempo
        await getPedidosParaCharts.run(); 

        // Ejecutar las queries de las otras fuentes de gráficos
        await getPedidosPendientesPorColabor.run(); // Fuente de Chart3
        await getPedidosPorCobrar.run();           // Fuente de chartPorCobrar
        await getPedidosParaCharts.run();          // Segunda ejecución para chartAtrasados
			  await storeValue('lastChartUpdate', Date.now()); // <-- AÑADIR ESTA LÍNEA

        // B. Forzar el repintado (RESET) de todos los gráficos
        await resetWidget("chartAtrasados", true); 
        await resetWidget("chartEnTiempo", true);  
        await resetWidget("Chart3", true);
        await resetWidget("chartPorCobrar", true); 
        
        // 5. Éxito
        showAlert('¡Lista y estado guardados correctamente!', 'success');

    } catch (error) {
        // 6. Manejar errores
        console.error("Error al guardar cambios:", error);
        showAlert('Error al guardar el estado general del pedido.', 'error');
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

// ESTA ES LA FUNCIÓN PARA EL MODAL (LEE getPedidoDetalle)
// ESTA ES LA FUNCIÓN PARA EL MODAL (LEE getPedidoDetalle)
getEstadoIndicador: () => {
    const estados = getEstadosOrdenados.data;
    const pedido = getPedidoDetalle.data; // Lee los datos del modal

    if (!pedido || !pedido.length || !estados || !estados.length) {
        return { text: "Cargando...", color: "#6B7280" }; 
    }

    const estadoIdCalculado = utils.calcularNuevoEstadoId(); 
    const estadoActual = estados.find(e => e.id === estadoIdCalculado);
    
    if (!estadoActual) {
        return { text: "Sin Estado", color: "#6B7280" };
    }
    
    const orden = estadoActual.orden_visual; 

    // IDs 9 (entregado), 10 (finalizado)
    if (orden >= 9) { 
        return { text: "Finalizado/Entregado", color: "#22C55E" }; // Verde
    }
    // ID 11 (cancelado)
    if (orden === 0 || orden === 11) { 
        return { text: "Cancelado", color: "#6B7280" }; // Gris
    }

    const fechaPlazoStr = pedido[0].fecha_plazo;
    if (!fechaPlazoStr) {
         return { text: "Plazo N/A", color: "#6B7280" };
    }

    const fechaPlazo = moment(fechaPlazoStr);
    const fechaActual = moment(); 
    
    if (fechaPlazo.isBefore(fechaActual)) {
        return { text: "Retrasado", color: "#b91c1c" }; // Rojo
    }
    
    return { text: "En Tiempo", color: "#553DE9" }; // Azul/Púrpura
},
	
resetFiltroMisTareas: async () => {
    // Asegura que el filtro de asignación esté APAGADO al cargar la página
    await storeValue('filtroMisTareasActivo', false);
},

onPageLoadLogic: async () => {
        // 1. Limpieza de filtro fantasma
        await storeValue('filtroMisTareasActivo', false);

        // 2. Ejecuta consulta de ID de usuario
        await getCurrentColaboradorId.run(); 

        // 3. Ejecuta las consultas de datos maestros (filtros desplegables)
        await getColaboradores.run(); 
        await getClientes_filtro.run(); 
        await getEstadosOrdenados.run();
        await getSubdepartamentos.run();

        // 4. Ejecuta las consultas de gráficos y la tabla principal
        await getPedidosPendientesPorColabor.run();
        await getPedidosFlujoMedio.run(); // (Si aún la usas)
        await getPedidosParaCharts.run();
        await getPedidosPorCobrar.run();
        await getPedidosColaborador.run(); 
    },

getFlujoMedioData: () => {
    const data = getPedidosFlujoMedio.data;
    if (!data || data.length === 0) return [];

    // --- El cálculo de color DEBE hacerse por fila (dentro del .map) ---
    return data.map(row => {
        
        // 1. Lógica de cálculo de color (Trasladada aquí)
        const minOrder = 3;
        const maxOrder = 9;
        const visualOrder = row.visual_order; // Asumiendo que row.visual_order es tu campo
        
        // Normaliza el orden de 0 a 1 
        const normalized = (visualOrder - minOrder) / (maxOrder - minOrder);
        
        // Calcula el color RGB (rojo a verde)
        const r = Math.round(255 * (1 - normalized));
        const g = Math.round(255 * normalized);
        const b = 0;
        
        // Define la variable 'color' que estaba dando error
        const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        return {
            label: row.state_name, 
            // CRÍTICO: Asegura el valor numérico para el Pie Chart
            value: parseInt(row.order_count), 
            color: color // <--- Ahora 'color' está definido aquí
        };
    });
},

// ESTA ES LA FUNCIÓN PARA LA TABLA (USA currentRow)
// ESTA ES LA FUNCIÓN PARA LA TABLA (USA currentRow)
getIndicadorParaTabla: (estadoInterno, fechaPlazoStr) => { 
    const estados = getEstadosOrdenados.data;

    if (!estados || !estados.length) {
        return { text: "Cargando...", color: "#6B7280" };
    }

    const estadoActual = estados.find(e => e.estado_interno === estadoInterno);
    const orden = estadoActual ? estadoActual.orden_visual : -1;
    
    if (!estadoActual) {
        return { text: "Sin Estado", color: "#6B7280" };
    }

    if (orden >= 9) { // 9=entregado, 10=finalizado
        return { text: "Finalizado", color: "#15803d" };
    }
    if (orden === 0 || orden === 11) { // 11=cancelado
        return { text: "Cancelado", color: "#6B7280" };
    }
    if (!fechaPlazoStr) {
         return { text: "Plazo N/A", color: "#6B7280" };
    }
    const fechaPlazo = moment(fechaPlazoStr);
    const fechaActual = moment(); 
    
    if (fechaPlazo.isBefore(fechaActual)) {
        return { text: "Retrasado", color: "#b91c1c" };
    }
    
    return { text: "En Tiempo", color: "#553DE9" };
},
	
	// JS Object: utils
// AÑADE ESTA FUNCIÓN AL FINAL DE TU JS OBJECT 'UTILS'

// JS Object: utils - Función: procesarDataPedidos (SECCIÓN CORREGIDA)
// JS Object: utils - Función: procesarDataPedidos (CORREGIDA Y COMPLETA)
procesarDataPedidos: () => {
    return getPedidosColaborador.data.map(pedido => {
        // --- CÓDIGO DE PARSING RESTAURADO ---
        let items = pedido.lista_solicitud;

        // 1. Asegurarse de que 'items' sea un array (maneja strings JSONB y null)
        try {
            items = (typeof items === 'string') ? JSON.parse(items || '[]') : items || [];
        } catch (e) {
            items = [];
        }
        // --- FIN DEL CÓDIGO DE PARSING ---


        // --- Agregación y Conteo (CORRECCIÓN CLAVE) ---
        const aggregation = {}; 
        if (Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
                const estado = item.estado_item || 'sin_estado'; 
                
                if (!aggregation[estado]) {
                    aggregation[estado] = 0;
                }
                // ¡CONTAR ITEM (SUMAR 1) — Solución anterior!
                aggregation[estado] += 1; 
            });
        }

       // --- Formato de Salida HTML (CORREGIDO) ---
        const outputLines = Object.keys(aggregation).map(estado => {
            const totalItems = aggregation[estado];
            // Cambiar a minúsculas:
            const label = totalItems === 1 ? 'artículo' : 'artículos';
            
            // Color fijo NEGRO, ignorando la lógica previa
            const color = 'black'; 
            
            // La etiqueta final ahora es: "artículo(s) [estado]"
            return `<span style="color: ${color};"><b>${totalItems} ${label}</b> ${estado}</span>`;
        });
        
        // 2. Devolver el pedido original con el campo de resumen
        return {
            ...pedido,
            productos_resumen: outputLines.length === 0 ? '<span style="color: grey;">- Vacío -</span>' : outputLines.join('<br>')
        };
    });
}
}