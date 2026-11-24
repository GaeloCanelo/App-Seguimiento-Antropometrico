import type { Sexo } from '../../domain';
import { birthDateBounds } from '../utils/dateBounds';
import { dateFromField } from '../utils/clinicalDisplay';
import { DateField } from './DateField';
import { FormField } from './FormField';
import { Choices } from './KidoLogUI';

const options = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
] as const;

export function PatientFields({
  name,
  onName,
  sex,
  onSex,
  date,
  onDate,
  editing = false,
  nameError,
  dateError,
}: {
  name: string;
  onName: (value: string) => void;
  sex: Sexo;
  onSex: (value: Sexo) => void;
  date: string;
  onDate: (value: string) => void;
  editing?: boolean;
  nameError?: string;
  dateError?: string;
}) {
  return (
    <>
      <FormField
        label={editing ? 'Nombre completo' : 'Nombre completo del infante'}
        icon="user"
        iconPosition="trailing"
        appearance="card"
        error={nameError}
        value={name}
        onChangeText={onName}
        autoCapitalize="words"
        placeholder="Nombre y apellidos"
      />
      <Choices label="Sexo" options={options} value={sex} onChange={onSex} />
      <DateField
        label="Fecha de nacimiento"
        bounds={birthDateBounds()}
        error={dateError}
        value={dateFromField(date)}
        onChange={onDate}
      />
    </>
  );
}
