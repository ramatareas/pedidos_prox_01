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

// JS Object: utils

loadCurrentProductList: async (selectedPedidoId) => {
    try {
        await storeValue('currentPedidoId', selectedPedidoId);
        const data = await getPedidoDetalle.run(); 

        if (!data || data.length === 0) {
            showAlert('Error: No se pudieron cargar los detalles del pedido.', 'error');
            return;
        }

        // --- INICIO: LÓGICA AÑADIDA ---
        // Si hay un cliente_id, ejecuta el query para traer su % de costo
        if (data[0]?.cliente_id) {
            await getClientePorcentaje.run();
        }
        // --- FIN: LÓGICA AÑADIDA ---

        let productList = data[0]?.lista_solicitud;
        if (typeof productList === 'string') {
            await storeValue('currentProductList', JSON.parse(productList || '[]'));
        } else {
            await storeValue('currentProductList', productList || []);
        }

        await resetWidget('selEstadoLote', true);
        await resetWidget('inpNuevoComentario', true);
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

        // --- Lectura de Inputs ---
        const productoText = inpProductoAdd.text;
        const cantidadText = inpCantidadAdd.text;
        const priceValue = inpPrecioVentaAdd.text;
        const tipoUnidadText = inpTipoUnidadAdd.text;
        const estadoItemValue = selEstadoItemAdd.selectedOptionValue;
        const comentariosItemText = inpComentariosItemAdd.text;
        
        // --- NUEVOS INPUTS AÑADIDOS ---
        const precioUnitValue = inpPrecioUnitarioAdd.text;
        const costoUnitValue = inpCostoUnitarioAdd.text;
        const costoVentasValue = inpCostoVentasAdd.text;
        const utilidadValue = inpUtilidadAdd.text;

        if (!productoText || !cantidadText) {
            showAlert('Producto y Cantidad son requeridos.', 'warning');
            return;
        }

        // Función para parsear a número o devolver null (para evitar 0s)
        const parseToFloatOrNull = (val) => {
            const num = parseFloat(val);
            return (val === null || val === "" || isNaN(num)) ? null : num;
        };

        const newProductData = {
            producto: productoText,
            cantidad: String(cantidadText || '1'),
            precio_venta: parseToFloatOrNull(priceValue),
            tipo_unidad: tipoUnidadText || "",
            estado_item: estadoItemValue || null,
            comentarios_item: comentariosItemText || "",
            
            // --- NUEVOS CAMPOS AÑADIDOS ---
            precio_unitario: parseToFloatOrNull(precioUnitValue),
            costo_unitario: parseToFloatOrNull(costoUnitValue),
            costo_ventas: parseToFloatOrNull(costoVentasValue),
            Utilidad: parseToFloatOrNull(utilidadValue)
        };

        modifiedList.push(newProductData);
        storeValue('currentProductList', modifiedList);
        closeModal('modAddProducto');
    },
	// --- FIN: Función Actualizada ---


	// --- INICIO: Función Actualizada ---
	// Función para guardar cambios desde modEditProducto
	upsertProducto: () => {
        const index = appsmith.store.editIndex;
        if (index === undefined || index === null || index < 0) {
            showAlert('Error: No se pudo determinar qué producto editar.', 'error');
            return;
        }
        
        const currentList = appsmith.store.currentProductList || [];
        let modifiedList = [...currentList];
        
        // --- Lectura de Inputs de Edición ---
        const productoText = inpProductoEdit.text;
        const cantidadText = inpCantidadEdit.text;
        const priceValue = inpPrecioVentaEdit.text;
        const tipoUnidadText = inpTipoUnidadEdit.text;
        const estadoItemValue = selEstadoItemEdit.selectedOptionValue;
        const comentariosItemText = inpComentariosItemEdit.text;
        
        // --- NUEVOS INPUTS DE EDICIÓN AÑADIDOS ---
        const precioUnitValue = inpPrecioUnitarioEdit.text;
        const costoUnitValue = inpCostoUnitarioEdit.text;
        const costoVentasValue = inpCostoVentasEdit.text;
        const utilidadValue = inpUtilidadEdit.text;

        if (!productoText || !cantidadText) {
            showAlert('Producto y Cantidad son requeridos.', 'warning');
            return;
        }

        // Función para parsear a número o devolver null
        const parseToFloatOrNull = (val) => {
            const num = parseFloat(val);
            return (val === null || val === "" || isNaN(num)) ? null : num;
        };

        const updatedProduct = {
            ...modifiedList[index], // Mantiene campos que no se editan
            producto: productoText,
            cantidad: String(cantidadText || '1'),
            precio_venta: parseToFloatOrNull(priceValue),
            tipo_unidad: tipoUnidadText || "",
            estado_item: estadoItemValue || null,
            comentarios_item: comentariosItemText || "",
            
            // --- NUEVOS CAMPOS AÑADIDOS ---
            precio_unitario: parseToFloatOrNull(precioUnitValue),
            costo_unitario: parseToFloatOrNull(costoUnitValue),
            costo_ventas: parseToFloatOrNull(costoVentasValue),
            Utilidad: parseToFloatOrNull(utilidadValue)
        };

        modifiedList[index] = updatedProduct;
        storeValue('currentProductList', modifiedList);
        storeValue('editRowData', undefined);
        storeValue('editIndex', undefined);
        closeModal('modEditProducto');
    },
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
        // 1. Guardar la lista (updateListaProductos)
        await updateListaProductos.run();
        console.log("Lista de productos guardada.");

        // 2. Calcular el nuevo estado (basado en la lista del store)
        const nuevoEstadoId = utils.calcularNuevoEstadoId();
        console.log("Nuevo estado ID calculado:", nuevoEstadoId);

        // 3. Ejecutar la actualización del estado general
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

        // B. Forzar el repintado (RESET) de todos los gráficos
        await resetWidget("chartAtrasados", true); 
        await resetWidget("chartEnTiempo", true);  
        await resetWidget("Chart3", true);
        await resetWidget("chartPorCobrar", true); 
        
        // C. (Opcional) Limpiar el selector de lote
        await resetWidget("selEstadoLote", true);

        // 5. Éxito
        showAlert('¡Lista y estado guardados correctamente!', 'success');

    } catch (error) {
        // 6. Manejar errores
        console.error("Error al guardar cambios:", error);
        // Este es el error que estás viendo:
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
	
// JS Object: utils - Función: procesarDataPedidos
procesarDataPedidos: () => {
  return getPedidosColaborador.data.map(pedido => {
    let items = pedido.lista_solicitud;

    // 1. Parsing seguro
    try {
        items = (typeof items === 'string') ? JSON.parse(items || '[]') : items || [];
    } catch (e) {
        items = [];
    }
    
    // 2. Inicializar contadores
    const aggregation = {}; 
    let totalCostoVentas = 0;
    let totalPrecioVenta = 0;
    let totalUtilidad = 0;

    if (Array.isArray(items) && items.length > 0) {
        items.forEach(item => {
            // A. Lógica de Resumen (existente)
            const estado = item.estado_item || 'sin_estado'; 
            const cantidad = parseInt(item.cantidad) || 1; // Para conteo de items

            if (!aggregation[estado]) aggregation[estado] = 0;
            aggregation[estado] += 1; // Cuenta ítems (filas)

            // B. Lógica de Sumas Financieras (NUEVA)
            // Usamos parseFloat y || 0 para evitar errores con nulls
            totalCostoVentas += parseFloat(item.costo_ventas || 0);
            totalPrecioVenta += parseFloat(item.precio_venta || 0);
            totalUtilidad += parseFloat(item.Utilidad || 0);
        });
    }

    // 3. Formato de Resumen HTML
    const outputLines = Object.keys(aggregation).map(estado => {
        const totalItems = aggregation[estado];
        const label = totalItems === 1 ? 'artículo' : 'artículos';
        return `<span style="color: black;"><b>${totalItems} ${label}</b> ${estado}</span>`;
    });
    
    // 4. Retorno del objeto enriquecido
    return {
        ...pedido,
        productos_resumen: outputLines.length === 0 ? '<span style="color: grey;">- Vacío -</span>' : outputLines.join('<br>'),
        // Nuevos campos calculados disponibles para la tabla
        calc_costo_ventas: totalCostoVentas,
        calc_precio_venta: totalPrecioVenta,
        calc_utilidad: totalUtilidad
    };
  });
},
	calcularSobreCosto: () => {
    // 1. Obtener el % del cliente (cargado por getClientePorcentaje)
    const porcentajeCliente = getClientePorcentaje.data[0]?.porcentaje_sobre_costo;

    // Validación
    if (porcentajeCliente === null || porcentajeCliente === undefined) {
        showAlert('El % sobre costo no está definido para este cliente. Revise el maestro de clientes.', 'error');
        return;
    }
    // Convertir el porcentaje (ej. 20%) a multiplicador (ej. 1.20)
    const multiplicador = 1 + (parseFloat(porcentajeCliente) / 100);

    // 2. Obtener valores de los inputs (asegurando que sean números)
    const costoUnit = parseFloat(inpCostoUnitarioEdit.text) || 0;
    const cantidad = parseFloat(inpCantidadEdit.text) || 0;

    // 3. Ejecutar cálculos en orden
    const costoVentas = costoUnit * cantidad;
    const precioUnit = costoUnit * multiplicador; // Precio unitario basado en el %
    const precioVenta = precioUnit * cantidad;
    const utilidad = precioVenta - costoVentas;

    // 4. Asignar valores a los widgets de edición
    inpCostoVentasEdit.setValue(costoVentas.toFixed(2));
    inpPrecioUnitarioEdit.setValue(precioUnit.toFixed(2)); // Actualiza el precio unitario
    inpPrecioVentaEdit.setValue(precioVenta.toFixed(2));
    inpUtilidadEdit.setValue(utilidad.toFixed(2));
},

// BOTÓN 2: CALCULAR USANDO PRECIO UNITARIO MANUAL
calcularManual: () => {
    // 1. Obtener valores de los inputs (asegurando que sean números)
    const costoUnit = parseFloat(inpCostoUnitarioEdit.text) || 0;
    const cantidad = parseFloat(inpCantidadEdit.text) || 0;
    const precioUnit = parseFloat(inpPrecioUnitarioEdit.text) || 0; // Lee el precio manual

    // 2. Ejecutar cálculos
    const costoVentas = costoUnit * cantidad;
    const precioVenta = precioUnit * cantidad; // Calcula la venta total
    const utilidad = precioVenta - costoVentas; // Calcula la utilidad

    // 3. Asignar valores (No tocamos precio_unitario porque fue la entrada)
    inpCostoVentasEdit.setValue(costoVentas.toFixed(2));
    inpPrecioVentaEdit.setValue(precioVenta.toFixed(2));
    inpUtilidadEdit.setValue(utilidad.toFixed(2));
},

calcularSobreCostoAdd: () => {
    // Obtener el % del cliente (ya cargado previamente)
    const porcentajeCliente = getClientePorcentaje.data[0]?.porcentaje_sobre_costo;

    if (porcentajeCliente === null || porcentajeCliente === undefined) {
        showAlert('El % sobre costo no está definido para este cliente.', 'error');
        return;
    }

    const multiplicador = 1 + (parseFloat(porcentajeCliente) / 100);

    // Leer inputs del modal ADD
    const costoUnit = parseFloat(inpCostoUnitarioAdd.text) || 0;
    const cantidad = parseFloat(inpCantidadAdd.text) || 0;

    // Cálculos
    const costoVentas = costoUnit * cantidad;
    const precioUnit = costoUnit * multiplicador;
    const precioVenta = precioUnit * cantidad;
    const utilidad = precioVenta - costoVentas;

    // Setear valores en inputs ADD
    inpCostoVentasAdd.setValue(costoVentas.toFixed(2));
    inpPrecioUnitarioAdd.setValue(precioUnit.toFixed(2));
    inpPrecioVentaAdd.setValue(precioVenta.toFixed(2));
    inpUtilidadAdd.setValue(utilidad.toFixed(2));
},

// 2. Calcular Manualmente (Para Añadir)
calcularManualAdd: () => {
    // Leer inputs del modal ADD
    const costoUnit = parseFloat(inpCostoUnitarioAdd.text) || 0;
    const cantidad = parseFloat(inpCantidadAdd.text) || 0;
    const precioUnit = parseFloat(inpPrecioUnitarioAdd.text) || 0; // Lee el precio manual

    // Cálculos
    const costoVentas = costoUnit * cantidad;
    const precioVenta = precioUnit * cantidad;
    const utilidad = precioVenta - costoVentas;

    // Setear valores en inputs ADD (No tocamos precio_unitario porque es la entrada)
    inpCostoVentasAdd.setValue(costoVentas.toFixed(2));
    inpPrecioVentaAdd.setValue(precioVenta.toFixed(2));
    inpUtilidadAdd.setValue(utilidad.toFixed(2));
},
	
	// JS Object: utils (Añadir al final)

calcularTotalesModal: () => {
    const lista = appsmith.store.currentProductList || [];
    
    // Usamos reduce para sumar de forma compacta
    const totales = lista.reduce((acc, item) => {
        return {
            costoVentas: acc.costoVentas + parseFloat(item.costo_ventas || 0),
            precioVenta: acc.precioVenta + parseFloat(item.precio_venta || 0),
            utilidad: acc.utilidad + parseFloat(item.Utilidad || 0)
        };
    }, { costoVentas: 0, precioVenta: 0, utilidad: 0 }); // Valores iniciales

    return totales;
}
}