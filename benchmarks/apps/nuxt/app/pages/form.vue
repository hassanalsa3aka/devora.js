<script setup lang="ts">
useHead({ title: "Form" });
const route = useRoute();
const sent = computed(() => route.query.sent === "1");
</script>

<template>
  <main>
    <h1>Form</h1>
    <p v-if="sent">Thanks!</p>
    <form method="post" action="/form">
      <label for="name">Name</label>
      <input id="name" name="name" />
      <button type="submit">Send</button>
    </form>
  </main>
</template>
