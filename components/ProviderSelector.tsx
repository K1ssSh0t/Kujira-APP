import * as React from "react";
import {
    View,
    Pressable,
    Modal,
    TouchableOpacity,
    StatusBar,
} from "react-native";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { ChevronDown } from "lucide-react-native";
import { useColorScheme } from "~/lib/useColorScheme";

export type Provider = "tioanime" | "animeflv" | "animeav1" | "monoschinos";

const PROVIDERS: { id: Provider; name: string }[] = [
    { id: "tioanime", name: "TioAnime" },
    { id: "animeflv", name: "AnimeFLV" },
    { id: "animeav1", name: "AnimeAV1" },
    { id: "monoschinos", name: "Monoschinos" },
];

interface ProviderSelectorProps {
    provider: Provider;
    onProviderChange: (provider: Provider) => void;
}

export function ProviderSelector({
    provider,
    onProviderChange,
}: ProviderSelectorProps) {
    const [modalVisible, setModalVisible] = React.useState(false);
    const { isDarkColorScheme } = useColorScheme();


    const selectedProvider = PROVIDERS.find((p) => p.id === provider);

    const handleSelect = (selectedProviderId: Provider) => {
        onProviderChange(selectedProviderId);
        setModalVisible(false);
    };

    return (
        <View className="mb-3">
            <Button
                variant="secondary"
                onPress={() => setModalVisible(true)}
                className="flex-row justify-between items-center w-full h-12 rounded-2xl border border-border px-4"
            >
                <Text className="font-semibold">{selectedProvider?.name || "Seleccionar Proveedor"}</Text>
                <ChevronDown
                    color={isDarkColorScheme ? "white" : "black"}
                    size={16}
                />
            </Button>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(!modalVisible);
                }}
            >
                <Pressable
                    onPress={() => setModalVisible(false)}
                    className="flex-1 justify-center items-center bg-black/70 px-8"
                    style={{
                        paddingTop: StatusBar.currentHeight,
                    }}
                >
                    <Pressable
                        onPress={() => { }} // Prevent closing modal when clicking inside the card
                        className="w-full bg-card rounded-3xl p-2 border border-border shadow-xl shadow-black/30"
                    >
                        {PROVIDERS.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => handleSelect(p.id)}
                                className={cn(
                                    "px-4 py-3.5 rounded-2xl flex-row items-center justify-between",
                                    provider === p.id && "bg-primary/15",
                                )}
                            >
                                <Text
                                    className={cn(
                                        "text-center text-[15px]",
                                        provider === p.id ? "font-bold text-foreground" : "font-medium text-foreground"
                                    )}
                                >
                                    {p.name}
                                </Text>
                                {provider === p.id && (
                                    <View className="w-2 h-2 rounded-full bg-primary" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}
