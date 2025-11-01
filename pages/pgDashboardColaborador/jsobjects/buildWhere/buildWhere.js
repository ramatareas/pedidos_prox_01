export default {
    getWhereClause: () => {
        let conditions = [];
        let chartFilterActive = false; 

        // Prioridad 1: Filtro de Gráfico
        // Si el usuario hizo click en un chart, se usa ese estado.
        const atrasadoX = chartAtrasados.selectedDataPoint?.x;
        const enTiempoX = chartEnTiempo.selectedDataPoint?.x;
        const ambosX = chartAmbos.selectedDataPoint?.x;

        if (!!atrasadoX) { 
            conditions.push(`me.estado_interno = '${atrasadoX}'`);
            chartFilterActive = true;
        } 
        else if (!!enTiempoX) {
            conditions.push(`me.estado_interno = '${enTiempoX}'`);
            chartFilterActive = true;
        } 
        else if (!!ambosX) {
            conditions.push(`me.estado_interno = '${ambosX}'`);
            chartFilterActive = true;
        }

        // Prioridad 2: Filtros Desplegables
        if (!chartFilterActive) {
            // Filtro Estado
            if (!!(selEstado.selectedOptionValue)) {
                conditions.push(`p.estado_id = ${selEstado.selectedOptionValue}`);
            }
            // Filtro Cliente
            if (!!(selCliente_filtro.selectedOptionValue)) {
                conditions.push(`p.cliente_id = ${selCliente_filtro.selectedOptionValue}`);
            }

            // Filtro Mis Tareas / Asignado A
            if (appsmith.store.filtroMisTareasActivo) {
                let colaboradorId = 1; 
                try { colaboradorId = getCurrentColaborador.data[0]?.id || 1; } catch (e) {}
                conditions.push(`p.asignado_a_id = ${colaboradorId}`);
            } 
            else if (!!(selAsignadoA_filtro.selectedOptionValue)) {
                conditions.push(`p.asignado_a_id = ${selAsignadoA_filtro.selectedOptionValue}`);
            }
        }

        // Condición Final: Si NO hay filtros, devolvemos cadena vacía.
        if (conditions.length === 0) {
            // Si llegamos aquí (Limpiar Filtros o recién cargado), no hay WHERE adicional.
            return ""; 
        }

        // Si HAY filtros, le agregamos la palabra AND al inicio.
        return " AND " + conditions.join(" AND ");
    }
}