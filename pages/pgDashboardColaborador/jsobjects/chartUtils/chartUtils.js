export default {
    prepararDatos: () => {
        const pedidos = getPedidosParaCharts.data;

        // Comprobación de seguridad
        if (!pedidos) {
            return { dataAtrasados: [], dataEnTiempo: [], dataAmbos: [] };
        }

        const ahora = moment();
        const contadoresAtrasados = {};
        const contadoresEnTiempo = {};
        const contadoresAmbos = {};

        for (const pedido of pedidos) {
            const estado = pedido.estado_interno;

            // --- ¡CORRECCIÓN CLAVE 1! ---
            // Si el estado es nulo o indefinido, sáltate este pedido.
            if (!estado) {
                continue; 
            }
            // --- FIN DE LA CORRECCIÓN ---

            const fechaPlazo = moment(pedido.fecha_plazo);

            // Inicializar contadores
            if (!contadoresAtrasados[estado]) contadoresAtrasados[estado] = 0;
            if (!contadoresEnTiempo[estado]) contadoresEnTiempo[estado] = 0;
            if (!contadoresAmbos[estado]) contadoresAmbos[estado] = 0;

            // Clasificar
            if (fechaPlazo.isBefore(ahora)) {
                contadoresAtrasados[estado]++;
            } else {
                contadoresEnTiempo[estado]++;
            }
            contadoresAmbos[estado]++;
        }

        const formatData = (contador) => {
            return Object.keys(contador).map(estado => ({
                x: estado,
                y: contador[estado]
            }));
        };

        return {
            dataAtrasados: formatData(contadoresAtrasados),
            dataEnTiempo: formatData(contadoresEnTiempo),
            dataAmbos: formatData(contadoresAmbos)
        };
    }
}