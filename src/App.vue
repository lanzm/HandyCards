<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { ensureWordbookSubpackage } from "@/utils/wordbooks";

onLaunch(() => {
  console.log("App Launch");
  ensureWordbookSubpackage().catch((e) => {
    console.warn("Preload subpackage warn:", e);
  });
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
@import "@/styles/theme.css";
@import "@/styles/animations.css";
</style>
