import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

BASE_URL = "http://localhost"

class HabitHubTests(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        opts = Options()
        opts.add_argument("--headless")
        opts.add_argument("--no-sandbox")
        opts.add_argument("--disable-dev-shm-usage")
        opts.add_argument("--window-size=1280,800")
        cls.driver = webdriver.Chrome(options=opts)
        cls.wait = WebDriverWait(cls.driver, 10)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def test_01_homepage_loads(self):
        self.driver.get(BASE_URL)
        self.assertIn("HabitHub", self.driver.title)
        brand = self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "brand-name")))
        self.assertEqual(brand.text, "HabitHub")

    def test_02_dashboard_view_active(self):
        self.driver.get(BASE_URL)
        self.wait.until(EC.visibility_of_element_located((By.ID, "view-dashboard")))
        active_view = self.driver.find_element(By.ID, "view-dashboard")
        self.assertIn("active", active_view.get_attribute("class"))

    def test_03_navigate_to_habits_view(self):
        self.driver.get(BASE_URL)
        nav = self.wait.until(EC.element_to_be_clickable((By.ID, "nav-habits")))
        nav.click()
        time.sleep(0.5)
        view = self.driver.find_element(By.ID, "view-habits")
        self.assertIn("active", view.get_attribute("class"))

    def test_04_add_habit_modal_opens(self):
        self.driver.get(BASE_URL)
        nav = self.wait.until(EC.element_to_be_clickable((By.ID, "nav-habits")))
        nav.click()
        btn = self.wait.until(EC.element_to_be_clickable((By.ID, "openModalBtn")))
        btn.click()
        overlay = self.wait.until(EC.presence_of_element_located((By.ID, "modalOverlay")))
        self.assertIn("open", overlay.get_attribute("class"))

    def test_05_create_new_habit(self):
        self.driver.get(BASE_URL)
        nav = self.wait.until(EC.element_to_be_clickable((By.ID, "nav-habits")))
        nav.click()
        btn = self.wait.until(EC.element_to_be_clickable((By.ID, "openModalBtn")))
        btn.click()
        name_field = self.wait.until(EC.visibility_of_element_located((By.ID, "habitName")))
        name_field.send_keys("Selenium Test Habit")
        desc_field = self.driver.find_element(By.ID, "habitDesc")
        desc_field.send_keys("Created by automated Selenium test")
        submit = self.driver.find_element(By.ID, "submitBtn")
        submit.click()
        time.sleep(1.5)
        grid = self.driver.find_element(By.ID, "habitsGrid")
        self.assertIn("Selenium Test Habit", grid.text)

    def test_06_navigate_to_analytics(self):
        self.driver.get(BASE_URL)
        nav = self.wait.until(EC.element_to_be_clickable((By.ID, "nav-analytics")))
        nav.click()
        time.sleep(0.5)
        view = self.driver.find_element(By.ID, "view-analytics")
        self.assertIn("active", view.get_attribute("class"))
        self.assertTrue(self.driver.find_element(By.ID, "timelineChart").is_displayed())

    def test_07_api_health_endpoint(self):
        import urllib.request, json
        with urllib.request.urlopen(BASE_URL + "/api/health") as r:
            data = json.loads(r.read())
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["db"], "connected")

if __name__ == "__main__":
    unittest.main(verbosity=2)
