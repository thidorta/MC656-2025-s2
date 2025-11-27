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
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.1),
    borderWidth: 1,
    borderColor: palette.divider,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 15,
  },
  placeholder: {
    color: palette.textMuted,
  },
  list: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.divider,
    marginTop: spacing(0.3),
  },
  option: {
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.divider,
  },
  empty: {
    color: palette.textMuted,
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.1),
  },
  optionText: {
    color: palette.text,
    fontSize: 14,
  },
});

export default DropdownSelector;
