export default {
    async borrarConPermiso(idPedido) {
        // --- CONFIGURACIÓN ---
        const usuarioAutorizado = "jose_ondarza@hotmail.com"; // <--- PON AQUÍ EL EMAIL DEL JEFE
        const usuarioActual = appsmith.user.email;
        // 1. Verificar Permiso
        if (usuarioActual !== usuarioAutorizado) {
            showAlert(`Hola ${usuarioActual}, no tienes permiso para borrar pedidos.`, "error");
            return; 
        }
        // 2. Ejecutar Borrado (Si pasó la validación)
        try {
            await deletePedido.run({ id: idPedido });
            showAlert("Pedido eliminado correctamente.", "success");
            
            // 3. Refrescar la tabla para que desaparezca
            // (Ajusta el nombre de tu query de lectura principal, ej: getPedidos o getPedidosFlujoMedio)
            await getPedidosColaborador.run(); 
        } catch (error) {
            showAlert("Error al borrar: " + error.message, "error");
        }
    }
}