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
import { colorScheme } from "nativewind";
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


    const selectedProvider = PROVIDERS.find((p) => p.id === provider);

    const handleSelect = (selectedProviderId: Provider) => {
        onProviderChange(selectedProviderId);
        setModalVisible(false);
    };

    return (
        <View className="mb-4">
            <Button
                variant="secondary"
                onPress={() => setModalVisible(true)}
                className="flex-row justify-between items-center w-full"
            >
                <Text>{selectedProvider?.name || "Seleccionar Proveedor"}</Text>
                <ChevronDown
                    color={colorScheme.get() === "dark" ? "white" : "black"}
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
                    className="flex-1 justify-center items-center bg-black/50 px-8"
                    style={{
                        paddingTop: StatusBar.currentHeight,
                    }}
                >
                    <Pressable
                        onPress={() => { }} // Prevent closing modal when clicking inside the card
                        className="w-full bg-card rounded-lg p-2 shadow-lg"
                    >
                        {PROVIDERS.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => handleSelect(p.id)}
                                className={cn(
                                    "p-4 rounded-md",
                                    provider === p.id && "bg-muted",
                                )}
                            >
                                <Text className="text-foreground text-center text-base">
                                    {p.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}
