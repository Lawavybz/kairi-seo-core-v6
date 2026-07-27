<?php
// proxy.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$query = $_GET['q'] ?? '';
$domain = $_GET['domain'] ?? '';

if (!$query || !$domain) {
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

// 1. MAKE SURE to paste your actual Serper API key inside these quotes!
$apiKey = "YOUR_SERPER_API_KEY_HERE"; 

$curl = curl_init();

// 2. Request 100 results and lock the search location to Kenya
curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://google.serper.dev/search',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS => json_encode([
      "q" => $query,
      "num" => 100, // Pulls 100 results instantly
      "gl" => "ke"  // GEOLOCATION: Forces the API to search Google Kenya
  ]),
  CURLOPT_HTTPHEADER => array(
    'X-API-KEY: ' . $apiKey,
    'Content-Type: application/json'
  ),
));

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

$data = json_decode($response, true);

// DEBUGGING: If the API key is wrong or you ran out of credits, output the actual error
if ($httpCode !== 200 || isset($data['message'])) {
    echo json_encode([
        'error' => 'Serper API Error: ' . ($data['message'] ?? 'Check your API Key'), 
        'code' => $httpCode
    ]);
    exit;
}

$results = [];

// 3. Scan the JSON organic results for your target domain
if (isset($data['organic'])) {
    foreach ($data['organic'] as $index => $result) {
        if (strpos(strtolower($result['link']), strtolower($domain)) !== false) {
            // Calculate which "page" this result would naturally sit on
            $pageNumber = floor($index / 10) + 1;
            $results[] = $pageNumber;
            break; 
        }
    }
}

// 4. Return the calculated page number to your JavaScript frontend
echo json_encode(['pages' => empty($results) ? [0] : $results]);