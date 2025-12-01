#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_worldPos;
in vec2 v_uv;

// Material props
uniform sampler2D u_texture;
uniform vec3 u_objectColor;
uniform float u_shininess; // Default to 32.0 if not set

// Camera
uniform vec3 u_viewPos;

// --- Lighting Structures ---
struct DirLight {
    vec3 direction;
    vec3 color;
    float ambientStrength;
};

struct PointLight {
    vec3 position;
    vec3 color;
    float constant;
    float linear;
    float quadratic;
};

struct SpotLight {
    vec3 position;
    vec3 direction;
    float cutOff;
    float outerCutOff;
    vec3 color;
};

// --- Uniforms ---
uniform DirLight u_dirLight;
uniform PointLight u_pointLight;
uniform SpotLight u_spotLight;

// --- Fog Uniforms ---
uniform bool u_fogEnabled;
uniform vec3 u_fogColor;
uniform float u_fogNear;
uniform float u_fogFar;

out vec4 fragColor;

// Function to calculate Directional Light
vec3 CalcDirLight(DirLight light, vec3 normal, vec3 viewDir, vec3 texColor) {
    vec3 lightDir = normalize(-light.direction);
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    
    vec3 ambient = light.ambientStrength * light.color * texColor;
    vec3 diffuse = diff * light.color * texColor;
    vec3 specular = spec * light.color * vec3(0.5); // Assuming white specular highlight
    return (ambient + diffuse + specular);
}

// Function to calculate Point Light (e.g., Treasure Chest Glow)
vec3 CalcPointLight(PointLight light, vec3 normal, vec3 fragPos, vec3 viewDir, vec3 texColor) {
    vec3 lightDir = normalize(light.position - fragPos);
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    // Attenuation
    float distance = length(light.position - fragPos);
    float attenuation = 1.0 / (light.constant + light.linear * distance + light.quadratic * (distance * distance));    
    
    vec3 ambient = 0.1 * light.color * texColor; // Weak ambient for point
    vec3 diffuse = diff * light.color * texColor;
    vec3 specular = spec * light.color * vec3(1.0);
    
    return (ambient + diffuse + specular) * attenuation;
}

// Function to calculate Spot Light (e.g., Camera Flashlight)
vec3 CalcSpotLight(SpotLight light, vec3 normal, vec3 fragPos, vec3 viewDir, vec3 texColor) {
    vec3 lightDir = normalize(light.position - fragPos);
    
    // Diffuse
    float diff = max(dot(normal, lightDir), 0.0);
    // Specular
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), u_shininess);
    
    // Soft edges
    float theta = dot(lightDir, normalize(-light.direction));
    float epsilon = light.cutOff - light.outerCutOff;
    float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);
    
    vec3 ambient = 0.0 * light.color * texColor;
    vec3 diffuse = diff * light.color * texColor;
    vec3 specular = spec * light.color * vec3(1.0);
    
    return (ambient + diffuse + specular) * intensity;
}

void main() {
    vec3 norm = normalize(v_normal);
    vec3 viewDir = normalize(u_viewPos - v_worldPos);
    vec3 texColor = texture(u_texture, v_uv).rgb * u_objectColor;
    
    // 1. Directional Light (Sun)
    vec3 result = CalcDirLight(u_dirLight, norm, viewDir, texColor);
    
    // 2. Point Light (Chest)
    result += CalcPointLight(u_pointLight, norm, v_worldPos, viewDir, texColor);
    
    // 3. Spot Light (Flashlight)
    result += CalcSpotLight(u_spotLight, norm, v_worldPos, viewDir, texColor);

    // --- Fog Calculations ---
    if (u_fogEnabled) {
        float distance = length(u_viewPos - v_worldPos);
        float fogFactor = (u_fogFar - distance) / (u_fogFar - u_fogNear);
        fogFactor = clamp(fogFactor, 0.0, 1.0);
        result = mix(u_fogColor, result, fogFactor);
    }

    fragColor = vec4(result, 1.0);
}