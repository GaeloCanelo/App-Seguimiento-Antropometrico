import { CATALOGO_INDICADORES } from '../src/domain/types';

describe('Configuración base del proyecto', () => {
  it('define los 5 indicadores antropométricos de la OMS', () => {
    expect(CATALOGO_INDICADORES).toHaveLength(5);
    expect(CATALOGO_INDICADORES.map((i) => i.codigo_indicador)).toEqual([
      'P_E',
      'T_E',
      'P_T',
      'PC_E',
      'IMC_E',
    ]);
  });
});
