plugins {
	java
	id("org.springframework.boot") version "4.0.0"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.bitsave"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

dependencies {
	// Production Dependencies
	implementation("org.springframework.boot:spring-boot-starter-mail")
	implementation("io.jsonwebtoken:jjwt-api:0.11.5")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("io.jsonwebtoken:jjwt-impl:0.11.5")
	implementation("io.jsonwebtoken:jjwt-jackson:0.11.5")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.jsoup:jsoup:1.18.3")
	implementation("com.bucket4j:bucket4j-core:8.10.1")
	implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	runtimeOnly("org.postgresql:postgresql")

	// Test Dependencies
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.security:spring-security-test")

	// H2 In-Memory Database für Unit Tests
	testImplementation("com.h2database:h2")

	// TestContainers für Integration Tests
	testImplementation("org.testcontainers:testcontainers:1.19.3")
	testImplementation("org.testcontainers:postgresql:1.19.3")
	testImplementation("org.testcontainers:junit-jupiter:1.19.3")

	// REST Assured für API Tests
	testImplementation("io.rest-assured:rest-assured:5.4.0")
	testImplementation("io.rest-assured:spring-mock-mvc:5.4.0")
	testImplementation("io.rest-assured:json-path:5.4.0")

	// Mockito (included in spring-boot-starter-test, but explicit for clarity)
	testImplementation("org.mockito:mockito-core")
	testImplementation("org.mockito:mockito-junit-jupiter")

	// GreenMail für Email Testing
	testImplementation("com.icegreen:greenmail:2.0.1")
	testImplementation("com.icegreen:greenmail-junit5:2.0.1")

	// JWT Testing
	testImplementation("io.jsonwebtoken:jjwt-api:0.11.5")

	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()

	// Test Execution Settings
	maxParallelForks = Runtime.getRuntime().availableProcessors() / 2

	// JVM Args for Tests
	jvmArgs = listOf(
		"-XX:+UseParallelGC",
		"-Xmx1g"
	)

	// Test Reporting
	testLogging {
		events("passed", "skipped", "failed")
		showStandardStreams = false
		showExceptions = true
		showCauses = true
		showStackTraces = true
	}
}

// Separate Integration Tests from Unit Tests
tasks.register<Test>("integrationTest") {
	description = "Runs integration tests."
	group = "verification"

	useJUnitPlatform {
		includeTags("integration")
	}

	shouldRunAfter(tasks.test)
}

tasks.register<Test>("unitTest") {
	description = "Runs unit tests."
	group = "verification"

	useJUnitPlatform {
		excludeTags("integration")
	}
}