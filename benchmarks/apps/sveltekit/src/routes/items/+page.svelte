<script>
  import Counter from "../../lib/Counter.svelte";
  let { data } = $props();
</script>

<svelte:head><title>Items</title></svelte:head>
<main>
  <h1>Items</h1>
  <Counter />
  <ul>
    {#each data.items as item (item.id)}
      <li>{item.name} — ${item.price.toFixed(2)}</li>
    {/each}
  </ul>
</main>
