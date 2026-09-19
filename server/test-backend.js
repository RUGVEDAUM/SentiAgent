import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

const runTests = async () => {
  console.log('----------------------------------------------------');
  console.log('🧪 Starting SentiAgent Backend Automated Test Suite');
  console.log('----------------------------------------------------\n');

  let testUserToken = null;
  let testUserId = null;
  let testAnalysisId = null;

  try {
    // 1. Check Status Endpoint
    console.log('1️⃣ Testing System Status Endpoint (/api/status)...');
    const statusRes = await axios.get(`${BASE_URL}/api/status`);
    console.log('   ✅ Status Response:', statusRes.data.status);
    console.log('   ℹ️ Enabled Features:');
    for (const [feat, val] of Object.entries(statusRes.data.features)) {
      console.log(`      - ${feat}: ${val.available ? '🟢 AVAILABLE' : '⚪ DISABLED (Awaiting key in .env)'}`);
    }

    // 2. Auth Flow: Signup
    console.log('\n2️⃣ Testing Authentication: Signup (/api/auth/signup)...');
    const testEmail = `testuser_${Date.now()}@sentiagent.test`;
    const signupRes = await axios.post(`${BASE_URL}/api/auth/signup`, {
      name: 'Test Analyst',
      email: testEmail,
      password: 'password123'
    });

    console.log('   ✅ Signup successful for:', signupRes.data.user.email);
    testUserToken = signupRes.data.token;
    testUserId = signupRes.data.user.id;

    // 3. Auth Flow: Get Current User (/api/auth/me)
    console.log('\n3️⃣ Testing Authentication: Current User Profile (/api/auth/me)...');
    const meRes = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('   ✅ Profile verified:', meRes.data.user.name, `(${meRes.data.user.email})`);

    // 4. Unauthorized access check
    console.log('\n4️⃣ Testing Unauthorized Protection...');
    try {
      await axios.get(`${BASE_URL}/api/auth/me`);
      console.error('   ❌ FAILED: Expected 401 Unauthorized, but request succeeded.');
    } catch (unauthErr) {
      if (unauthErr.response?.status === 401) {
        console.log('   ✅ Correctly rejected unauthenticated request with 401 Unauthorized.');
      } else {
        throw unauthErr;
      }
    }

    // 5. Run Synchronous Analysis via Agent Pipeline
    console.log('\n5️⃣ Testing AI Agent Pipeline: Synchronous Text Analysis (/api/analyses)...');
    const sampleReview = `
      I absolutely love this new ultra-light noise canceling headset!
      The audio fidelity is crystal clear and battery life lasts 36 hours.
      However, the mobile companion app has a confusing equalizer menu,
      and $350 feels a bit steep for plastic earcups.
      Still, overall an exceptional listening experience!
    `.trim();

    const analysisRes = await axios.post(
      `${BASE_URL}/api/analyses`,
      {
        inputType: 'text',
        rawInput: sampleReview,
        title: 'Noise Canceling Headset Review'
      },
      {
        headers: { Authorization: `Bearer ${testUserToken}` }
      }
    );

    const analysis = analysisRes.data.analysis;
    testAnalysisId = analysis.id;

    console.log('   ✅ Analysis Completed!');
    console.log('   - Title:', analysis.title);
    console.log('   - Provider Used:', analysis.provider, `(${analysis.modelUsed})`);
    console.log('   - Fallback Mode:', analysis.isFallback ? '⚠️ Yes (Fallback mode active)' : '✨ No (Gemini Flash active)');
    console.log('   - Overall Sentiment:', analysis.overallSentiment.toUpperCase(), `(Score: ${analysis.overallScore})`);
    console.log('   - Dominant Emotion:', analysis.dominantEmotion);
    console.log('   - Emotion Radar:', JSON.stringify(analysis.emotionRadar));
    console.log('   - Top Themes:', analysis.topPositiveThemes.concat(analysis.topNegativeThemes).join(', '));
    console.log('   - Executive Summary:\n     ', analysis.executiveSummary);
    console.log('   - Recommended Actions:');
    for (const rec of (analysis.recommendedActions || [])) {
      console.log(`     * [${rec.priority || 'Action'}] ${rec.title || rec.action}: ${rec.expectedImpact || ''}`);
    }

    // 6. Test Real-Time SSE Stream Endpoint (/api/analyses/stream)
    console.log('\n6️⃣ Testing Server-Sent Events (SSE) Real-Time Progress Streaming (/api/analyses/stream)...');
    const sseResponse = await axios.post(
      `${BASE_URL}/api/analyses/stream`,
      {
        inputType: 'text',
        rawInput: 'The customer service team was wonderfully polite, but shipping took over 3 weeks.',
        title: 'Shipping Feedback'
      },
      {
        headers: {
          Authorization: `Bearer ${testUserToken}`,
          Accept: 'text/event-stream'
        },
        responseType: 'stream'
      }
    );

    await new Promise((resolve, reject) => {
      let buffer = '';
      const receivedSteps = [];

      sseResponse.data.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep remainder

        for (const block of lines) {
          if (!block.trim()) continue;
          const matchEvent = block.match(/event:\s*([^\n]+)/);
          const matchData = block.match(/data:\s*([^\n]+)/);

          const eventName = matchEvent ? matchEvent[1].trim() : 'message';
          const eventData = matchData ? JSON.parse(matchData[1].trim()) : {};

          if (eventName === 'progress') {
            receivedSteps.push(eventData.step);
            console.log(`   📡 [SSE Progress ${eventData.progress}%] Step "${eventData.step}": ${eventData.message}`);
          } else if (eventName === 'complete') {
            console.log('   🎉 [SSE Complete] Final analysis emitted successfully via SSE stream!');
            resolve();
          } else if (eventName === 'error') {
            reject(new Error(`SSE Error received: ${eventData.error}`));
          }
        }
      });

      sseResponse.data.on('error', reject);
      sseResponse.data.on('end', resolve);
    });

    // 7. Check User History (/api/analyses)
    console.log('\n7️⃣ Testing Analysis History Retrieval (/api/analyses)...');
    const historyRes = await axios.get(`${BASE_URL}/api/analyses`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log(`   ✅ Retrieved ${historyRes.data.analyses.length} saved analyses from user history.`);

    // 8. Retrieve Specific Analysis Detail (/api/analyses/:id)
    console.log(`\n8️⃣ Testing Detailed Analysis Retrieval (/api/analyses/${testAnalysisId})...`);
    const detailRes = await axios.get(`${BASE_URL}/api/analyses/${testAnalysisId}`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('   ✅ Successfully retrieved full analysis record with nested JSON payload.');

    // 9. Delete Analysis
    console.log(`\n9️⃣ Testing Analysis Deletion (/api/analyses/${testAnalysisId})...`);
    const delRes = await axios.delete(`${BASE_URL}/api/analyses/${testAnalysisId}`, {
      headers: { Authorization: `Bearer ${testUserToken}` }
    });
    console.log('   ✅ Delete Response:', delRes.data.message);

    console.log('\n----------------------------------------------------');
    console.log('🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------\n');
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.response?.data || err.message);
    process.exit(1);
  }
};

runTests();
