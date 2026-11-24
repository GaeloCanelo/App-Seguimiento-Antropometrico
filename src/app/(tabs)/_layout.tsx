import { Redirect, Tabs } from 'expo-router';
import { useApp } from '../../viewmodels/AppProvider';
import { KidoLogTabBar } from '../../views/components/KidoLogTabBar';
import { useTheme } from '../../views/theme/ThemeProvider';

export default function TabsLayout() {
  const { medico } = useApp();
  const theme = useTheme();
  if (!medico) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
      }}
      tabBar={({ state, emitter, navigateToTab }) => (
        <KidoLogTabBar
          active={state.routes[state.index]?.name}
          onSelect={(tab) => {
            const route = state.routes.find((item) => item.name === tab.name);
            if (!route) return;
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (route.key !== state.routes[state.index]?.key && !event.defaultPrevented)
              navigateToTab(route.key);
          }}
          onLongPress={(tab) => {
            const route = state.routes.find((item) => item.name === tab.name);
            if (route) emitter.emit({ type: 'tabLongPress', target: route.key });
          }}
        />
      )}
    >
      <Tabs.Screen name="pacientes" options={{ title: 'Pacientes' }} />
      <Tabs.Screen
        name="registrar-paciente"
        options={{ title: 'Registrar paciente', tabBarLabel: 'Nuevo' }}
      />
      <Tabs.Screen name="cuenta" options={{ title: 'Configuración', tabBarLabel: 'Ajustes' }} />
    </Tabs>
  );
}
