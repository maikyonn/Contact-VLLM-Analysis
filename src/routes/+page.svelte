<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { processVisionResults, shuffleArray, generateUserId, type EvaluationPair } from '$lib/dataProcessor';
  
  let allPairs: EvaluationPair[] = [];
  let unevaluatedPairs: EvaluationPair[] = [];
  let currentPair: EvaluationPair | null = null;
  let contactStates: Record<number, 'check' | 'x' | null> = {};
  let missedInteractions = 0;
  let userId = '';
  let loading = true;
  let submitting = false;
  let globalProgress = { total: 0, completed: 0 };
  
  $: progress = globalProgress.total > 0 ? (globalProgress.completed / globalProgress.total) * 100 : 0;
  $: isComplete = !currentPair;

  onMount(async () => {
    userId = generateUserId();
    await loadVisionData();
    await loadGlobalProgress();
    await getNextUnevaluatedPair();
  });

  async function loadVisionData() {
    try {
      const response = await fetch('/vision_llm_results.json');
      const data = await response.json();
      console.log('First few objects from JSON:', Object.entries(data).slice(0, 3));
      allPairs = processVisionResults(data);
    } catch (error) {
      console.error('Error loading vision data:', error);
    }
  }

  async function loadGlobalProgress() {
    try {
      // Get all completed evaluations
      const { data: completedEvals, error } = await supabase
        .from('evaluations')
        .select('image_id, model_name');
      
      if (error) throw error;
      
      // Create set of completed pairs
      const completedPairs = new Set(
        completedEvals?.map(evaluation => `${evaluation.image_id}_${evaluation.model_name}`) || []
      );
      
      // Filter out completed pairs
      unevaluatedPairs = allPairs.filter(pair => 
        !completedPairs.has(`${pair.imageId}_${pair.modelName}`)
      );
      
      globalProgress = {
        total: allPairs.length,
        completed: completedEvals?.length || 0
      };
      
      loading = false;
    } catch (error) {
      console.error('Error loading global progress:', error);
      loading = false;
    }
  }

  async function getNextUnevaluatedPair() {
    if (unevaluatedPairs.length > 0) {
      // Get a random unevaluated pair
      const randomIndex = Math.floor(Math.random() * unevaluatedPairs.length);
      currentPair = unevaluatedPairs[randomIndex];
    } else {
      currentPair = null;
    }
  }

  async function submitEvaluation() {
    if (!currentPair || submitting) return;
    
    submitting = true;
    
    try {
      // Check if this pair was already evaluated by someone else
      const { data: existingEval, error: checkError } = await supabase
        .from('evaluations')
        .select('id')
        .eq('image_id', currentPair.imageId)
        .eq('model_name', currentPair.modelName)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingEval && existingEval.length > 0) {
        // Already evaluated, skip to next
        await loadNextPair();
        return;
      }
      
      // Calculate checks and X's
      const checks = Object.values(contactStates).filter(state => state === 'check').length;
      const xs = Object.values(contactStates).filter(state => state === 'x').length;
      
      // Submit the evaluation
      const { error } = await supabase
        .from('evaluations')
        .insert({
          image_id: currentPair.imageId,
          model_name: currentPair.modelName,
          user_id: userId,
          checks: checks,
          xs: xs,
          missed_interactions: missedInteractions,
          image_url: currentPair.imageUrl,
          original_contacts: currentPair.originalContacts,
          model_contacts: currentPair.modelContacts,
          model_raw_response: currentPair.modelRawResponse
        });
      
      if (error) {
        // Handle race condition - someone else submitted at the same time
        if (error.message?.includes('duplicate') || error.code === '23505') {
          await loadNextPair();
          return;
        }
        throw error;
      }
      
      // Update global progress
      globalProgress.completed += 1;
      
      // Remove this pair from unevaluated list
      unevaluatedPairs = unevaluatedPairs.filter(pair => 
        !(pair.imageId === currentPair!.imageId && pair.modelName === currentPair!.modelName)
      );
      
      await loadNextPair();
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      alert('Error submitting evaluation. Please try again.');
    } finally {
      submitting = false;
    }
  }

  async function loadNextPair() {
    contactStates = {}; // Reset contact states
    missedInteractions = 0; // Reset missed interactions
    await getNextUnevaluatedPair();
  }
  
  function toggleContactState(index: number, state: 'check' | 'x') {
    if (contactStates[index] === state) {
      contactStates[index] = null;
    } else {
      contactStates[index] = state;
    }
  }

  async function refreshProgress() {
    await loadGlobalProgress();
    if (!currentPair) {
      await getNextUnevaluatedPair();
    }
  }
</script>

<svelte:head>
  <title>Semantic Evaluation Tool</title>
</svelte:head>

<div class="container mx-auto px-4 py-4">
  <header class="text-center mb-4">
    <h1 class="text-2xl font-bold text-gray-900 mb-2">Semantic Description Evaluation</h1>
    <p class="text-gray-600 max-w-2xl mx-auto text-sm">
      For each interaction listed, click ✓ if it's accurately described in the image, or ✗ if not.
      Then use the slider to indicate any interactions visible in the image but not described.
    </p>
  </header>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>
  {:else if isComplete}
    <div class="max-w-2xl mx-auto text-center">
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        <h2 class="text-2xl font-bold mb-2">🎉 All Evaluations Complete!</h2>
        <p>Amazing! The community has completed all {globalProgress.total} evaluations.</p>
        <p class="mt-2">Thank you for contributing to improving vision model performance!</p>
        <button
          on:click={refreshProgress}
          class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🔄 Check for New Evaluations
        </button>
      </div>
    </div>
  {:else if currentPair}
    <!-- Progress Bar -->
    <div class="max-w-4xl mx-auto mb-4">
      <div class="flex justify-between text-sm text-gray-600 mb-2">
        <span>Global Progress: {globalProgress.completed} of {globalProgress.total} evaluations</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: {progress}%"></div>
      </div>
      <div class="text-center text-xs text-gray-500 mt-2">
        {unevaluatedPairs.length} remaining evaluations
      </div>
    </div>

    <div class="max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-4">
        <!-- Image Section (Left) -->
        <div class="bg-white rounded-lg shadow-md p-4">
          <div class="text-center">
            <img 
              src={currentPair.imageUrl} 
              alt="Evaluation image"
              class="w-full max-w-2xl mx-auto rounded-lg shadow-sm"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Evaluation Section (Right) -->
        <div class="bg-white rounded-lg shadow-md p-4 flex flex-col">
          <!-- Description Section -->
          <div class="mb-4 flex-1">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Description of Human Interactions:</h3>
            <div class="bg-gray-50 p-3 rounded-lg">
              {#if currentPair.modelContacts && currentPair.modelContacts.length > 0}
                <ul class="grid grid-cols-1 {currentPair.modelContacts.length > 6 ? 'lg:grid-cols-2' : ''} gap-2 text-gray-700 text-sm">
                  {#each currentPair.modelContacts as contact, index}
                    <li class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors bg-white border border-gray-200">
                      <button
                        on:click={() => toggleContactState(index, 'x')}
                        class="p-1.5 rounded transition-all flex-shrink-0 {contactStates[index] === 'x' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-red-100'}"
                        title="Mark as incorrect"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      <span class="flex-1 mx-2 leading-snug text-left">{contact}</span>
                      
                      <button
                        on:click={() => toggleContactState(index, 'check')}
                        class="p-1.5 rounded transition-all flex-shrink-0 {contactStates[index] === 'check' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-green-100'}"
                        title="Mark as correct"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="text-gray-500 italic text-center text-base">No human interactions detected</p>
              {/if}
            </div>
          </div>

          <!-- Missed Interactions Slider -->
          <div class="mb-4">
            <label for="missed" class="block text-base font-medium text-gray-700 mb-2">
              How many interactions were missed in the description?
            </label>
            <div class="flex items-center space-x-3 mb-2">
              <span class="text-sm text-gray-500">0</span>
              <input 
                type="range" 
                id="missed"
                min="0" 
                max="10" 
                bind:value={missedInteractions}
                class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span class="text-sm text-gray-500">10</span>
            </div>
            <div class="text-center">
              <div class="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-lg font-bold text-lg">
                {missedInteractions} missed
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-4">
            <button
              on:click={refreshProgress}
              disabled={submitting}
              class="px-6 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Refresh
            </button>
            <button
              on:click={submitEvaluation}
              disabled={submitting}
              class="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {#if submitting}
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              {:else}
                Submit & Next →
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  input[type="range"]#missed {
    background: linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%);
  }
  
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  
  input[type="range"]::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
</style>
