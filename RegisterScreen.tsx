// src/screens/RegisterScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleRegister = () => {
    if (!email || !senha) {
      alert("Preencha todos os campos!");
      return;
    }
    // 🔑 Aqui você pode salvar no backend depois
    alert("Conta registrada com sucesso!");
    navigation.replace("Login"); // volta para login depois do registro
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-6">
      <Text className="text-2xl font-bold mb-6 text-blue-800">Registrar</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity
        className="w-full bg-blue-500 py-3 rounded-lg mb-4"
        onPress={handleRegister}
      >
        <Text className="text-white text-center font-semibold">Registrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text className="text-green-600">Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </View>
  );
}
