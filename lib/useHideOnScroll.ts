import { useCallback } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
    Extrapolation,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

const SHOW_DURATION = 220;
const HIDE_DURATION = 250;

/**
 * Oculta el header al deslizar hacia abajo y lo muestra al subir,
 * estilo Kick. El header colapsa su altura para que la lista gane pantalla.
 *
 * Uso:
 *   const { scrollHandler, headerStyle, onHeaderLayout, reset } = useHideOnScroll(60);
 *   <Animated.View style={[{ overflow: "hidden" }, headerStyle]}>
 *     <View onLayout={onHeaderLayout}>...todo el header...</View>
 *   </Animated.View>
 *   <Animated.FlatList onScroll={scrollHandler} scrollEventThrottle={16} ... />
 */
export function useHideOnScroll(defaultHeight = 120) {
    const headerHeight = useSharedValue(defaultHeight);
    const progress = useSharedValue(0); // 0 = visible, 1 = oculto
    const lastY = useSharedValue(0);

    const reset = useCallback(() => {
        lastY.value = 0;
        progress.value = withTiming(0, { duration: SHOW_DURATION });
    }, [lastY, progress]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const y = event.contentOffset.y;
            const dy = y - lastY.value;

            if (y <= 10) {
                // Arriba del todo: siempre visible
                progress.value = withTiming(0, { duration: SHOW_DURATION });
            } else if (dy > 6 && y > 60) {
                // Bajando: ocultar
                progress.value = withTiming(1, { duration: HIDE_DURATION });
            } else if (dy < -6) {
                // Subiendo: mostrar
                progress.value = withTiming(0, { duration: SHOW_DURATION });
            }
            lastY.value = y;
        },
    });

    const onHeaderLayout = useCallback(
        (event: LayoutChangeEvent) => {
            const h = event.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - headerHeight.value) > 1) {
                headerHeight.value = h;
            }
        },
        [headerHeight, progress]
    );

    const headerStyle = useAnimatedStyle(() => ({
        height: Math.max(0, headerHeight.value * (1 - progress.value)),
        opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    }));

    return { scrollHandler, headerStyle, onHeaderLayout, reset };
}
