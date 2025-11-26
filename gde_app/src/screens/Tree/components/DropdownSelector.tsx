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
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.85}
      >
        <View>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={[styles.dropdownValue, !selectedLabel && styles.dropdownPlaceholder]}>
            {selectedLabel ?? placeholder}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.text}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {options.length === 0 ? (
            <Text style={styles.dropdownEmpty}>Nenhuma opcao disponivel</Text>
          ) : (
            options.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={styles.dropdownOption}
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
  dropdownWrapper: {
    marginBottom: spacing(1.25),
  },
  dropdownHeader: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  dropdownValue: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  dropdownPlaceholder: {
    color: palette.textMuted,
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    marginTop: spacing(0.5),
  },
  dropdownOption: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  dropdownEmpty: {
    color: palette.textMuted,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.25),
  },
  optionText: {
    color: palette.text,
    fontFamily: 'monospace',
  },
});

export default DropdownSelector;
