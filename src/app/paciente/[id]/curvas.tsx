import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { CATALOGO_INDICADORES, clasificarIndicador } from '../../../domain';
import {
  construirGeometriaCurvaOMS,
  inferirTablaPTInicial,
  type VistaCurva,
} from '../../../services/growthChartBuilder';
import { useAppearance } from '../../../views/theme/ThemeProvider';
import { useResultsViewModel } from '../../../viewmodels/useResultsViewModel';
import { ClinicalScreen } from '../../../views/components/ClinicalScreen';
import { DesignSvg } from '../../../views/components/DesignSvg';
import { useDialog } from '../../../views/components/DialogProvider';
import { ZoomableGrowthCurve } from '../../../views/components/ZoomableGrowthCurve';
import { KidoLogCard } from '../../../views/components/KidoLogCard';
import {
  Choices,
  IconAction,
  Notice,
  ScreenFeedback,
  useUI,
} from '../../../views/components/KidoLogUI';
import { PrimaryButton } from '../../../views/components/PrimaryButton';
import { displayDate } from '../../../views/utils/clinicalDisplay';
import {
  classificationInk,
  indicatorDesign,
  indicatorFromParam,
  indicatorOptions,
} from '../../../views/utils/indicators';

const views = [
  { value: 'Z', label: 'Puntaje Z' },
  { value: 'PERCENTIL', label: 'Percentiles' },
] as const;
const pTOptions = [
  { value: 'LONGITUD', label: 'Longitud · 45–110 cm' },
  { value: 'TALLA', label: 'Talla · 65–120 cm' },
] as const;
const chartInfo =
  'Referencias OMS por sexo y por edad o medida. Clasificación referencial, no diagnóstica.';

export default function CurvasCrecimientoScreen() {
  const dialog = useDialog();
  const ui = useUI();
  const { mode, theme } = useAppearance();
  const {
    id,
    consulta,
    indicador: indicatorParam,
  } = useLocalSearchParams<{
    id: string;
    consulta?: string;
    indicador?: string | string[];
  }>();
  const { paciente, historialConsultas, cargando, error } = useResultsViewModel(undefined, id);
  const indicador = indicatorFromParam(indicatorParam);
  const [vista, setVista] = useState<VistaCurva>('Z');
  const [manualTable, setTable] = useState<'LONGITUD' | 'TALLA' | null>(null);
  const [selected, setSelected] = useState<string | undefined>();
  const activeConsultation = selected ?? consulta;
  const consultationForTable = historialConsultas.find(
    (item) => item.consulta.id_consulta === activeConsultation,
  );
  const tipoTablaPT =
    manualTable ??
    inferirTablaPTInicial(consultationForTable ? [consultationForTable] : historialConsultas);
  const chart = useMemo(
    () =>
      paciente
        ? construirGeometriaCurvaOMS({
            indicador,
            sexo: paciente.sexo,
            vista,
            fechaNacimiento: paciente.fecha_nacimiento,
            consultas: historialConsultas,
            tipoTablaPT,
          })
        : null,
    [historialConsultas, indicador, paciente, tipoTablaPT, vista],
  );

  if (!paciente || !chart)
    return (
      <ClinicalScreen title="Curvas OMS">
        <ScreenFeedback loading={cargando} error={error} empty="Paciente no encontrado." />
      </ClinicalScreen>
    );

  const point = activeConsultation
    ? chart.puntosPaciente.find((item) => item.id_consulta === activeConsultation)
    : chart.puntosPaciente.at(-1);
  const tone = indicatorDesign[indicador][mode];
  const title = CATALOGO_INDICADORES.find((item) => item.codigo_indicador === indicador)?.nombre;

  return (
    <ClinicalScreen
      title="Curvas OMS"
      info={chartInfo}
      action={
        <IconAction
          icon="info"
          label="Sobre las curvas OMS"
          onPress={() =>
            dialog('Sobre las curvas OMS', chartInfo, [{ text: 'Cerrar', style: 'cancel' }])
          }
          onHero
        />
      }
    >
      <KidoLogCard style={{ gap: theme.spacing.compact }}>
        <Choices
          label="Indicador"
          options={indicatorOptions(mode)}
          value={indicador}
          onChange={(value) => router.setParams({ indicador: value })}
        />
        <Choices options={views} value={vista} onChange={setVista} />
        {indicador === 'P_T' ? (
          <Choices options={pTOptions} value={tipoTablaPT} onChange={setTable} />
        ) : null}
      </KidoLogCard>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Text accessibilityRole="header" style={[ui.section, { color: tone.ink }]}>
        {title}
      </Text>
      <KidoLogCard style={{ backgroundColor: tone.surface, borderColor: tone.surface }}>
        <ZoomableGrowthCurve
          key={`${indicador}-${vista}-${tipoTablaPT}`}
          geometria={chart}
          idConsultaSeleccionada={point?.id_consulta}
          onSeleccionarPunto={(item) => setSelected(item.id_consulta)}
        />
      </KidoLogCard>
      <Text style={ui.muted}>
        Límites · mediana · paciente. {vista === 'Z' ? 'Z −3 a +3' : 'P3 a P97'}
        {chart.puntosPaciente.length ? ' · Toca un punto para ver su consulta.' : ''}
      </Text>
      {point ? (
        <KidoLogCard style={{ gap: theme.spacing.compact }}>
          <View style={ui.row}>
            <DesignSvg name="chart" size={22} />
            <View style={ui.grow}>
              <Text style={ui.title}>
                Consulta seleccionada · {displayDate(point.fecha_consulta)}
              </Text>
              <Text style={ui.muted}>
                {point.valorObservado.toFixed(2)} {chart.unidadY} · Z {point.puntajeZ.toFixed(2)} · P
                {point.percentil.toFixed(1)}
              </Text>
              <Text
                style={[
                  ui.muted,
                  {
                    color: classificationInk(
                      clasificarIndicador(indicador, point.puntajeZ).severidad,
                      theme,
                      tone.ink,
                    ),
                  },
                ]}
              >
                {point.clasificacionEtiqueta}
                {point.esAtipico ? ' · Atípico' : ''}
              </Text>
            </View>
          </View>
          <PrimaryButton
            title="Ver consulta"
            variant="secondary"
            onPress={() => router.push(`/paciente/consulta/${point.id_consulta}`)}
          />
        </KidoLogCard>
      ) : (
        <Text style={ui.muted}>
          {chart.puntosPaciente.length && activeConsultation
            ? 'La consulta seleccionada no tiene un punto en esta curva.'
            : 'Aún no hay mediciones graficables para este indicador.'}
        </Text>
      )}
      {chart.puntosOmitidos.length ? (
        <KidoLogCard>
          <Text style={ui.title}>Consultas no graficadas</Text>
          {chart.puntosOmitidos.map((item) => (
            <Text key={item.id_consulta} style={ui.muted}>
              {displayDate(item.fecha_consulta)} · {item.motivo}
            </Text>
          ))}
        </KidoLogCard>
      ) : null}
    </ClinicalScreen>
  );
}
