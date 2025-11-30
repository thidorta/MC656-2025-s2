import React, { useState } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DropdownOption } from '../types';
import { palette, spacing } from '../styles';

interface Props {
  label: string;
  value: string | number | null;
  placeholder?: string;
  options: DropdownOption[];
  onSelect: (value: string | number) => void;
}

const DropdownSelector: React.FC<Props> = ({ label, value, placeholder = '*selecionar*', options, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen((prev) => !prev)} activeOpacity={0.85}>
        <View>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !selectedLabel && styles.placeholder]}>{selectedLabel ?? placeholder}</Text>
        </View>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={palette.text} />
      </TouchableOpacity>

      {open && (
        <View style={styles.list}>
          {options.length === 0 ? (
            <Text style={styles.empty}>Nenhuma opcao disponivel</Text>
          ) : (
            options.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={styles.option}
                onPress={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing(0.5),
  },
  header: {
    backgroundColor: palette.surface2,
    borderRadius: 8,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.5),
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  value: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 15,
  },
  placeholder: {
    color: palette.textSecondary,
  },
  list: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: spacing(0.5),
  },
  option: {
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  empty: {
    color: palette.textSecondary,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(1.5),
  },
  optionText: {
    color: palette.text,
    fontSize: 15,
  },
});

export default DropdownSelector;
