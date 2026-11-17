export const environment = {
  production: true,
  apiUrl: '/api/v1',
  /**
   * Llave PÚBLICA de Culqi (pk_test_… o pk_live_…, del CulqiPanel > Desarrollo > API Keys).
   * Mientras esté vacía, el pago muestra un aviso y no se puede pagar.
   * Nunca pongas aquí la llave secreta (sk_…): esa va solo en el backend (CULQI_LLAVE_SECRETA).
   */
  culqiPublicKey: 'pk_test_NCp1LDOi6JLka8hc',
};
