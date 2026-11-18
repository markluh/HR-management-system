package com.example.hr;

import com.example.hr.entity.Employee;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class HrSystemApplicationTests {

    @LocalServerPort
    int port;

    @Autowired
    TestRestTemplate rest;

    private String url(String path) {
        return "http://localhost:" + port + path;
    }

    private String loginCookie(String username, String password) {
        var response = rest.postForEntity(url("/api/auth/login"),
                Map.of("username", username, "password", password), String.class);
        assertEquals(200, response.getStatusCode().value(), "login failed for " + username);
        String cookie = response.getHeaders().getFirst(HttpHeaders.SET_COOKIE);
        return cookie != null && cookie.contains(";") ? cookie.substring(0, cookie.indexOf(';')) : cookie;
    }

    private ResponseEntity<String> withCookie(String cookie, String path, HttpMethod method, Object body) {
        var headers = new HttpHeaders();
        headers.set(HttpHeaders.COOKIE, cookie);
        if (body != null) headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Object> entity = new HttpEntity<>(body, headers);
        return rest.exchange(url(path), method, entity, String.class);
    }

    @Test
    void contextLoads() {
    }

    @Test
    void unauthenticatedRequestIsRejected() {
        var response = rest.getForEntity(url("/api/employees"), String.class);
        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    void wrongPasswordIsRejected() {
        var response = rest.postForEntity(url("/api/auth/login"),
                Map.of("username", "admin", "password", "wrong"), String.class);
        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    void employeesAreSeeded() {
        String cookie = loginCookie("admin", "admin123");
        var response = withCookie(cookie, "/api/employees", HttpMethod.GET, null);
        assertEquals(200, response.getStatusCode().value());
        assertTrue(response.getBody().contains("alice.nguyen@acme.com"));
    }

    @Test
    void normalUserCannotCreateEmployees() {
        String cookie = loginCookie("bob", "bob123");
        Employee emp = new Employee();
        emp.setFirstName("Nope");
        emp.setLastName("User");
        emp.setEmail("nope.user@acme.com");
        emp.setHireDate(java.time.LocalDate.now());
        var response = withCookie(cookie, "/api/employees", HttpMethod.POST, emp);
        assertEquals(403, response.getStatusCode().value());
    }

    @Test
    void duplicateEmailIsRejected() {
        String cookie = loginCookie("admin", "admin123");
        Employee emp = new Employee();
        emp.setFirstName("Dup");
        emp.setLastName("Email");
        emp.setEmail("alice.nguyen@acme.com");
        emp.setHireDate(java.time.LocalDate.now());
        var response = withCookie(cookie, "/api/employees", HttpMethod.POST, emp);
        assertEquals(409, response.getStatusCode().value());
    }

    @Test
    void validationErrorIsReturned() {
        String cookie = loginCookie("admin", "admin123");
        Employee emp = new Employee();
        emp.setEmail("not-an-email");
        emp.setHireDate(java.time.LocalDate.now());
        var response = withCookie(cookie, "/api/employees", HttpMethod.POST, emp);
        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    void userRequestsLeaveForSelfAndAdminApproves() {
        String bob = loginCookie("bob", "bob123");

        // bob (employee 2) requests leave for himself
        var selfBody = Map.of(
                "employee", Map.of("id", 2),
                "type", "VACATION",
                "startDate", java.time.LocalDate.now().plusDays(20).toString(),
                "endDate", java.time.LocalDate.now().plusDays(22).toString());
        var selfResponse = withCookie(bob, "/api/leave-requests", HttpMethod.POST, selfBody);
        assertEquals(201, selfResponse.getStatusCode().value());

        // bob cannot request leave for someone else
        var otherBody = Map.of(
                "employee", Map.of("id", 3),
                "type", "VACATION",
                "startDate", java.time.LocalDate.now().plusDays(20).toString(),
                "endDate", java.time.LocalDate.now().plusDays(22).toString());
        var otherResponse = withCookie(bob, "/api/leave-requests", HttpMethod.POST, otherBody);
        assertEquals(403, otherResponse.getStatusCode().value());

        // admin can approve it
        String admin = loginCookie("admin", "admin123");
        var listResponse = withCookie(admin, "/api/leave-requests?status=PENDING", HttpMethod.GET, null);
        assertTrue(listResponse.getBody().contains("VACATION"));

        // find the new request via bob's own list
        var own = withCookie(bob, "/api/leave-requests?status=PENDING&employeeId=2", HttpMethod.GET, null);
        assertTrue(own.getBody().contains("VACATION"));

        // bob's unfiltered list must NOT contain other employees' leaves (e.g. Carla's SICK leave)
        var bobAll = withCookie(bob, "/api/leave-requests", HttpMethod.GET, null);
        assertTrue(bobAll.getBody().contains("VACATION"));
        assertTrue(!bobAll.getBody().contains("SICK"), "regular user must not see other users' leaves");

        // admin sees everything, including Carla's SICK leave
        var adminAll = withCookie(admin, "/api/leave-requests", HttpMethod.GET, null);
        assertTrue(adminAll.getBody().contains("SICK"));
    }

    @Test
    void attendanceSummaryIsAvailable() {
        String cookie = loginCookie("bob", "bob123");
        var response = withCookie(cookie, "/api/attendance/summary", HttpMethod.GET, null);
        assertEquals(200, response.getStatusCode().value());
        String body = response.getBody();
        assertTrue(body.contains("\"present\""));
        assertTrue(body.contains("\"onLeave\""));
    }

    @Test
    void adminAssignsWorkAndUserUpdatesProgressAndUploads() throws Exception {
        String adminCookie = loginCookie("admin", "admin123");
        String bobCookie = loginCookie("bob", "bob123");

        // find bob's user id
        var meResponse = withCookie(bobCookie, "/api/auth/me", HttpMethod.GET, null);
        String meBody = meResponse.getBody();
        long bobUserId = Long.parseLong(meBody.replaceAll(".*\"id\":(\\d+).*", "$1"));

        // admin creates an assignment for bob
        var create = withCookie(adminCookie, "/api/work", HttpMethod.POST, Map.of(
                "title", "Write README section",
                "description", "Document the API",
                "assignedToUserId", bobUserId,
                "dueDate", java.time.LocalDate.now().plusDays(5).toString()));
        assertEquals(200, create.getStatusCode().value(), create.getBody());
        String body = create.getBody();
        long assignmentId = Long.parseLong(body.replaceAll(".*\"id\":(\\d+).*", "$1"));

        // bob cannot assign work
        var forbidden = withCookie(bobCookie, "/api/work", HttpMethod.POST, Map.of(
                "title", "x", "assignedToUserId", bobUserId,
                "dueDate", java.time.LocalDate.now().toString()));
        assertEquals(403, forbidden.getStatusCode().value());

        // bob updates progress
        var progress = withCookie(bobCookie, "/api/work/" + assignmentId + "/progress", HttpMethod.PUT,
                Map.of("progressPercent", 60));
        assertEquals(200, progress.getStatusCode().value());
        assertTrue(progress.getBody().contains("\"progressPercent\":60"));

        // bob uploads a file
        byte[] bytes = "hello work file".getBytes();
        var fileHeaders = new HttpHeaders();
        fileHeaders.set(HttpHeaders.COOKIE, bobCookie);
        fileHeaders.setContentType(MediaType.MULTIPART_FORM_DATA);
        org.springframework.util.MultiValueMap<String, Object> parts = new org.springframework.util.LinkedMultiValueMap<>();
        var partHeaders = new HttpHeaders();
        partHeaders.setContentDisposition(org.springframework.http.ContentDisposition.formData()
                .name("file").filename("notes.txt").build());
        parts.add("file", new HttpEntity<>(bytes, partHeaders));
        var upload = rest.exchange(url("/api/work/" + assignmentId + "/files"), HttpMethod.POST,
                new HttpEntity<>(parts, fileHeaders), String.class);
        assertEquals(200, upload.getStatusCode().value(), upload.getBody());
        long fileId = Long.parseLong(upload.getBody().replaceAll(".*\"id\":(\\d+).*", "$1"));

        // bob downloads the file again
        var downloadHeaders = new HttpHeaders();
        downloadHeaders.set(HttpHeaders.COOKIE, bobCookie);
        var download = rest.exchange(url("/api/work/files/" + fileId + "/download"), HttpMethod.GET,
                new HttpEntity<>(downloadHeaders), byte[].class);
        assertEquals(200, download.getStatusCode().value());
        assertEquals("hello work file", new String(download.getBody()));
    }

    @Test
    void publicJobApplicationSchedulesInterview() {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        org.springframework.util.MultiValueMap<String, Object> parts = new org.springframework.util.LinkedMultiValueMap<>();
        parts.add("fullName", "Test Applicant");
        parts.add("email", "applicant@example.com");
        parts.add("position", "Developer");
        parts.add("coverLetter", "I would love to join.");
        var cvHeaders = new HttpHeaders();
        cvHeaders.setContentDisposition(org.springframework.http.ContentDisposition.formData()
                .name("cv").filename("cv.pdf").build());
        parts.add("cv", new HttpEntity<>("fake pdf".getBytes(), cvHeaders));
        var certHeaders = new HttpHeaders();
        certHeaders.setContentDisposition(org.springframework.http.ContentDisposition.formData()
                .name("certificates").filename("certs.pdf").build());
        parts.add("certificates", new HttpEntity<>("fake certs".getBytes(), certHeaders));

        var response = rest.exchange(url("/api/applications"), HttpMethod.POST,
                new HttpEntity<>(parts, headers), String.class);
        assertEquals(200, response.getStatusCode().value(), response.getBody());
        // interview was automatically scheduled in the future
        assertTrue(response.getBody().contains("INTERVIEW_SCHEDULED"));
        assertTrue(response.getBody().contains("interviewDateTime"));
        assertTrue(response.getBody().contains("cv.pdf"));

        // anonymous listing is forbidden
        var forbidden = rest.getForEntity(url("/api/applications"), String.class);
        assertEquals(401, forbidden.getStatusCode().value());
    }

    @Test
    void defaultAvatarIsGenerated() {
        String cookie = loginCookie("bob", "bob123");
        var meResponse = withCookie(cookie, "/api/auth/me", HttpMethod.GET, null);
        long bobId = Long.parseLong(meResponse.getBody().replaceAll(".*\"id\":(\\d+).*", "$1"));
        var headers = new HttpHeaders();
        headers.set(HttpHeaders.COOKIE, cookie);
        var pic = rest.exchange(url("/api/users/" + bobId + "/picture"), HttpMethod.GET,
                new HttpEntity<>(headers), byte[].class);
        assertEquals(200, pic.getStatusCode().value());
        assertTrue(new String(pic.getBody()).contains("<svg"));
    }
}
