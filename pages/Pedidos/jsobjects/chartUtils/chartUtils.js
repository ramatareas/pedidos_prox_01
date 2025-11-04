export default {
prepararDatos: () => {
    const pedidos = getPedidosParaCharts.data;
    const estadosData = getEstadosOrdenados.data; 
    
    // Incluimos dataAmbos para mantener la estructura de la respuesta
    const contadoresAmbos = {}; 
    
    if (!pedidos || !estadosData) {
        return { dataAtrasados: [], dataEnTiempo: [], dataAmbos: [] };
    }
    
    const ahora = moment();
    const contadoresAtrasados = {};
    const contadoresEnTiempo = {}; // Usaremos este para "Flujo Central Activo"
    
    // Inicializar contadores
    estadosData.forEach(estado => {
        contadoresAtrasados[estado.estado_interno] = 0;
        contadoresEnTiempo[estado.estado_interno] = 0;
        contadoresAmbos[estado.estado_interno] = 0; 
    });

    // 1. Contar los pedidos por estado
    for (const pedido of pedidos) {
        const estado = pedido.estado_interno;
        const orden = pedido.orden_visual;
        
        if (!estado) continue; 

        const fechaPlazo = moment(pedido.fecha_plazo);
        const estaAtrasado = fechaPlazo.isBefore(ahora);
        
        contadoresAmbos[estado]++; 

        // 1. Atrasados: (Independiente del estado, solo por fecha)
        if (estaAtrasado) {
            contadoresAtrasados[estado]++;
        }
        
        // 2. Flujo Central Activo (chartEnTiempo): 
        // Pedidos con orden visual entre 3 (aprobado/inicio de proceso) y 9 (entregado).
        // Excluye estados iniciales (1, 2) y estados de cierre (10, 11).
        if (orden >= 3 && orden <= 9) { 
            contadoresEnTiempo[estado]++; 
        }
    }

    // 2. Función para convertir y mapear
    const formatAndMapData = (contador) => {
        const mappedData = Object.keys(contador).map(estado => {
            const estadoInfo = estadosData.find(e => e.estado_interno === estado);
            return {
                x: estado,
                y: contador[estado],
                orden: estadoInfo ? estadoInfo.orden_visual : 999 
            };
        });
        return mappedData.filter(item => item.y > 0);
    };

    // 3. Obtener los arrays de datos (ordenando por orden_visual descendente)
    const dataAtrasados = formatAndMapData(contadoresAtrasados);
    const dataEnTiempo = formatAndMapData(contadoresEnTiempo);
    const dataAmbos = formatAndMapData(contadoresAmbos);

    dataAtrasados.sort((a, b) => b.orden - a.orden); 
    dataEnTiempo.sort((a, b) => b.orden - a.orden);
    dataAmbos.sort((a, b) => b.orden - a.orden);

    // 4. Devolver
    return {
        dataAtrasados: dataAtrasados.map(item => ({ x: item.x, y: item.y })),
        dataEnTiempo: dataEnTiempo.map(item => ({ x: item.x, y: item.y })),
        dataAmbos: dataAmbos.map(item => ({ x: item.x, y: item.y })) // Incluimos ambos para completar
    };
}
}