import { folioVisible } from '../../../../views/utils/patientDisplay';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CATALOGO_INDICADORES,
  clasificarIndicador,
  formatearEdadMesesYDias,
  type CodigoIndicador,
} from '../../../../domain';
import { construirGeometriaCurvaOMS } from '../../../../services/growthChartBuilder';
import {
  construirNombreArchivoPdf,
  generarYCompartirReportePdf,
} from '../../../../services/pdfReportService';
import { useResultsViewModel } from '../../../../viewmodels/useResultsViewModel';
import { ClinicalScreen } from '../../../../views/components/ClinicalScreen';
import { useDialog } from '../../../../views/components/DialogProvider';
import { ZoomableGrowthCurve } from '../../../../views/components/ZoomableGrowthCurve';
import { KidoLogCard } from '../../../../views/components/KidoLogCard';
import {
  Choices,
  Gradient,
  Notice,
  ScreenFeedback,
  useUI,
} from '../../../../views/components/KidoLogUI';
import { PrimaryButton } from '../../../../views/components/PrimaryButton';
import { useAppearance, useThemedStyles } from '../../../../views/theme/ThemeProvider';
import type { KidoLogTheme } from '../../../../views/theme/tokens';
import { displayDate } from '../../../../views/utils/clinicalDisplay';
import { mensajeEnEspanol } from '../../../../views/utils/formErrors';
import { indicatorDesign, indicatorOptions } from '../../../../views/utils/indicators';

export default function ReportePdfScreen() {
  const dialog = useDialog();
  const styles = useThemedStyles(createStyles);
  const { mode, theme } = useAppearance();
  const ui = useUI();
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { detalle, paciente, historialConsultas, cargando, error } = useResultsViewModel(
    idConsulta,
    undefined,
    true,
  );
  const [indicadorGrafica, setIndicadorGrafica] = useState<CodigoIndicador>('P_E');
  const [exportando, setExportando] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exporting = useRef(false);

  const chart = useMemo(() => {
    if (!paciente || !detalle) return null;
    const eligible = historialConsultas.filter(
      (item) => item.consulta.fecha_consulta <= detalle.consulta.fecha_consulta,
    );
    return construirGeometriaCurvaOMS({
      indicador: indicadorGrafica,
      sexo: paciente.sexo,
      vista: 'Z',
      fechaNacimiento: paciente.fecha_nacimiento,
      consultas: eligible.length ? eligible : [detalle],
    });
  }, [detalle, historialConsultas, indicadorGrafica, paciente]);

  if (!detalle || !paciente || !chart)
    return (
      <ClinicalScreen title="Reporte PDF">
        <ScreenFeedback loading={cargando} error={error} empty="Consulta no encontrada." />
      </ClinicalScreen>
    );

  const { consulta, resultados } = detalle;
  const age = formatearEdadMesesYDias(paciente.fecha_nacimiento, consulta.fecha_consulta).texto;
  const filename = construirNombreArchivoPdf(paciente.folio_clinico, consulta.fecha_consulta);
  const position = consulta.posicion_medicion === 'ACOSTADO' ? 'Acostado' : 'De pie';
  const adjusted = consulta.longitud_talla_cm !== consulta.longitud_talla_ajustada_cm;
  const rows = [
    ['Paciente', paciente.nombre],
    ['Folio', folioVisible(paciente.folio_clinico)],
    ['Sexo / edad', `${paciente.sexo === 'M' ? 'Masculino' : 'Femenino'} · ${age}`],
    ['Consulta', displayDate(consulta.fecha_consulta)],
    [
      'Mediciones',
      `${consulta.peso_kg.toFixed(2)} kg · ${consulta.longitud_talla_cm.toFixed(1)} cm · PC ${consulta.perimetro_cefalico_cm.toFixed(1)} cm`,
    ],
    [
      'Posición',
      `${position} · ${adjusted ? `talla ajustada ${consulta.longitud_talla_ajustada_cm.toFixed(1)} cm` : 'sin corrección'}`,
    ],
  ];

  const exportar = async () => {
    if (exporting.current) return;
    exporting.current = true;
    setExportando(true);
    setExportError(null);
    try {
      await generarYCompartirReportePdf({
        paciente,
        detalle,
        historialConsultas,
        indicadorGrafica,
      });
      dialog(
        'Exportar PDF',
        'Guarda o comparte el reporte desde las opciones del dispositivo.',
        [
          { text: 'Cerrar', style: 'cancel' },
          {
            text: 'Ver expediente',
            onPress: () => router.dismissTo(`/paciente/${paciente.id_paciente}`),
          },
        ],
      );
    } catch (reason) {
      const msg = mensajeEnEspanol(reason, 'No se pudo crear el documento. Puedes reintentar.');
      setExportError(msg);
      dialog('Error al generar PDF', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reintentar', onPress: () => void exportar() },
      ]);
    } finally {
      exporting.current = false;
      setExportando(false);
    }
  };

  return (
    <ClinicalScreen
      title="Reporte PDF"
      footer={
        <PrimaryButton title="Exportar o compartir PDF" onPress={exportar} loading={exportando} />
      }
    >
      <KidoLogCard style={styles.report}>
        <View style={[ui.between, styles.reportIdentity]}>
          <Text style={styles.brand}>KidoLog</Text>
          <Text style={ui.muted}>Informe de consulta</Text>
        </View>
        <View style={styles.divider}>
          <Gradient colors={theme.colors.heroGradient} />
        </View>
        <Text style={ui.section}>Seguimiento antropométrico</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={[ui.muted, styles.key]}>{label}</Text>
            <Text style={[ui.title, styles.value]}>{value}</Text>
          </View>
        ))}
        {consulta.atipico_confirmado ? (
          <Text style={[ui.muted, { color: theme.colors.warning }]}>
            Valores atípicos confirmados
          </Text>
        ) : null}
        <Text style={ui.section}>Resultados OMS</Text>
        {CATALOGO_INDICADORES.map(({ codigo_indicador: code }) => {
          const result = resultados.find((value) => value.codigo_indicador === code);
          const z = result?.puntaje_z;
          const centile = result?.percentil;
          const display =
            result?.estado === 'CALCULADO' && z != null && centile != null
              ? `${z.toFixed(2)} / ${centile.toFixed(1)} · ${clasificarIndicador(code, z).etiqueta}${result.es_atipico ? ' · Atípico' : ''}`
              : 'No aplica';
          return (
            <View key={code} style={styles.row}>
              <Text
                style={[
                  styles.key,
                  {
                    color: indicatorDesign[code][mode].ink,
                  },
                ]}
              >
                {indicatorDesign[code].label}
              </Text>
              <Text style={[ui.title, styles.value]}>{display}</Text>
            </View>
          );
        })}
        <Text style={ui.title}>Curva de crecimiento</Text>
        <Choices
          options={indicatorOptions(mode)}
          value={indicadorGrafica}
          onChange={setIndicadorGrafica}
        />
        <ZoomableGrowthCurve
          key={indicadorGrafica}
          geometria={chart}
          idConsultaSeleccionada={consulta.id_consulta}
        />
        <Text style={ui.muted}>Clasificación referencial, no diagnóstica.</Text>
      </KidoLogCard>
      <Text style={ui.muted}>Archivo: {filename}</Text>
      {error || exportError ? <Notice tone="error">{exportError ?? error ?? ''}</Notice> : null}
    </ClinicalScreen>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    report: { padding: theme.spacing.md, gap: theme.spacing.compact },
    reportIdentity: {
      backgroundColor: theme.colors.peachSurface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.compact,
    },
    brand: { color: theme.colors.peachInk, ...theme.typography.sectionTitle },
    divider: { height: 3, overflow: 'hidden' },
    row: { flexDirection: 'row', gap: theme.spacing.sm },
    key: { flex: 1, ...theme.typography.bodySmall },
    value: { flex: 2, fontSize: 12 },
  });
