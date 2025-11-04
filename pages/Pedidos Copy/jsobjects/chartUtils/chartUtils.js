export default {
prepararDatos: () => {
    const pedidos = getPedidosParaCharts.data;
    const estadosData = getEstadosOrdenados.data; 
    
    if (!pedidos || !estadosData) {
        return { dataAtrasados: [], dataEnTiempo: [], dataAmbos: [] };
    }
    
    const ahora = moment();
    const contadoresAtrasados = {};
    const contadoresEnTiempo = {};
    const contadoresAmbos = {};

    // 1. Contar los pedidos por estado
    for (const pedido of pedidos) {
        const estado = pedido.estado_interno;
        if (!estado) continue; 

        const fechaPlazo = moment(pedido.fecha_plazo);

        if (!contadoresAtrasados[estado]) contadoresAtrasados[estado] = 0;
        if (!contadoresEnTiempo[estado]) contadoresEnTiempo[estado] = 0;
        if (!contadoresAmbos[estado]) contadoresAmbos[estado] = 0;

        if (fechaPlazo.isBefore(ahora)) {
            contadoresAtrasados[estado]++;
        } else {
            contadoresEnTiempo[estado]++;
        }
        contadoresAmbos[estado]++;
    }

    // 2. Función para convertir objeto a array y mapear el orden visual
    const formatAndMapData = (contador) => {
        return Object.keys(contador).map(estado => {
            const estadoInfo = estadosData.find(e => e.estado_interno === estado);
            
            return {
                x: estado,
                y: contador[estado],
                orden: estadoInfo ? estadoInfo.orden_visual : 999 
            };
        });
    };

    // 3. Obtener los arrays de datos
    const dataAtrasados = formatAndMapData(contadoresAtrasados);
    const dataEnTiempo = formatAndMapData(contadoresEnTiempo);
    const dataAmbos = formatAndMapData(contadoresAmbos);

    // 4. ORDENAR DESCENDENTE (B a A): b - a
    // Esto asegura que los estados con el mayor orden_visual aparezcan primero.
    dataAtrasados.sort((a, b) => b.orden - a.orden); 
    dataEnTiempo.sort((a, b) => b.orden - a.orden);
    dataAmbos.sort((a, b) => b.orden - a.orden);


    // 5. Devolver los arrays ya ordenados y mapeados
    return {
        dataAtrasados: dataAtrasados.map(item => ({ x: item.x, y: item.y })),
        dataEnTiempo: dataEnTiempo.map(item => ({ x: item.x, y: item.y })),
        dataAmbos: dataAmbos.map(item => ({ x: item.x, y: item.y }))
    };
}
}